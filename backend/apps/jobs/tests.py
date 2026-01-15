# backend/apps/jobs/tests.py
import json
from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase, RequestFactory

from apps.jobs import views
from apps.jobs.models import Job, JobChecklistItem
from apps.accounts.models import Company, User
from apps.locations.models import Location, ChecklistTemplate


def _build_required_kwargs(model_cls, overrides=None):
    """
    Универсальная фабрика: создаёт kwargs для .objects.create(),
    заполняя обязательные поля примитивными значениями.

    Работает так:
    - пропускает auto поля
    - пропускает nullable/blankable/default
    - для Char/Text/Email/Phone -> строка
    - для bool -> True
    - для int -> 1
    - для decimal/float -> 1
    - для date/datetime/time -> простые значения
    - FK должны быть в overrides (или поле nullable)
    """
    overrides = overrides or {}
    kwargs = {}

    for field in model_cls._meta.fields:
        # auto / pk
        if getattr(field, "auto_created", False):
            continue
        if getattr(field, "primary_key", False):
            continue
        if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
            continue

        name = field.name

        # уже задано вручную
        if name in overrides:
            continue

        # можно не задавать
        if getattr(field, "null", False) or getattr(field, "blank", False):
            continue
        if field.has_default():
            continue

        # ForeignKey/OneToOne: обязателен override
        if field.is_relation and field.many_to_one:
            # если FK обязателен, но не передан — пусть упадёт явно
            continue

        internal = field.get_internal_type()

        if internal in ("CharField", "TextField", "EmailField", "SlugField", "URLField"):
            kwargs[name] = f"test_{name}"
        elif internal in ("BooleanField",):
            kwargs[name] = True
        elif internal in ("IntegerField", "BigIntegerField", "PositiveIntegerField", "SmallIntegerField"):
            kwargs[name] = 1
        elif internal in ("FloatField",):
            kwargs[name] = 1.0
        elif internal in ("DecimalField",):
            kwargs[name] = "1.00"
        elif internal in ("DateField",):
            kwargs[name] = date(2026, 1, 15)
        elif internal in ("DateTimeField",):
            # пусть модель сама проставляет, если требуется, но тут дадим заглушку
            from django.utils import timezone
            kwargs[name] = timezone.now()
        elif internal in ("TimeField",):
            from datetime import time
            kwargs[name] = time(9, 0)
        else:
            # На случай неожиданных обязательных полей
            kwargs[name] = f"test_{name}"

    kwargs.update(overrides)
    return kwargs


def _create(model_cls, **overrides):
    kwargs = _build_required_kwargs(model_cls, overrides)
    return model_cls.objects.create(**kwargs)


def _json_request(rf: RequestFactory, method: str, path: str, data: dict):
    body = json.dumps(data).encode("utf-8")
    if method == "POST":
        return rf.post(path, data=body, content_type="application/json")
    if method == "GET":
        return rf.get(path, data=data)
    raise ValueError("Unsupported method")


class JobsChecklistTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

        # Company
        self.company = _create(Company)

        # Location (важно иметь координаты для check-in/out)
        # Если у Location есть FK на company — подставим.
        loc_overrides = {
            "latitude": 25.2048,
            "longitude": 55.2708,
        }
        # Попытаемся угадать поле company если есть
        if any(f.name == "company" for f in Location._meta.fields):
            loc_overrides["company"] = self.company
        self.location = _create(Location, **loc_overrides)

        # ChecklistTemplate
        tmpl_overrides = {}
        if any(f.name == "company" for f in ChecklistTemplate._meta.fields):
            tmpl_overrides["company"] = self.company
        self.template = _create(ChecklistTemplate, **tmpl_overrides)

        # Создаём 2 пункта шаблона через related manager items
        item_model = self.template.items.model

        # Пытаемся поддержать разные схемы: order/order_index, is_required/required
        def _create_template_item(order_value: int, text: str, required: bool):
            overrides = {"text": text}

            if any(f.name == "order" for f in item_model._meta.fields):
                overrides["order"] = order_value
            elif any(f.name == "order_index" for f in item_model._meta.fields):
                overrides["order_index"] = order_value

            if any(f.name == "is_required" for f in item_model._meta.fields):
                overrides["is_required"] = required
            elif any(f.name == "required" for f in item_model._meta.fields):
                overrides["required"] = required

            # FK на template
            if any(f.name == "checklist_template" for f in item_model._meta.fields):
                overrides["checklist_template"] = self.template
                _create(item_model, **overrides)
            else:
                # если items — через FK checklist_template_id под другим именем (крайне редко)
                # попробуем создать через manager
                self.template.items.create(**_build_required_kwargs(item_model, overrides))

        _create_template_item(1, "Wipe surfaces", True)
        _create_template_item(2, "Empty trash", True)

        # Users: cleaner_1 assigned, cleaner_2 чужой
        user_base = {"company": self.company} if any(f.name == "company" for f in User._meta.fields) else {}
        # role если есть
        if any(f.name == "role" for f in User._meta.fields):
            self.cleaner_1 = _create(User, **user_base, role="cleaner", full_name="Cleaner One")
            self.cleaner_2 = _create(User, **user_base, role="cleaner", full_name="Cleaner Two")
        else:
            self.cleaner_1 = _create(User, **user_base, full_name="Cleaner One")
            self.cleaner_2 = _create(User, **user_base, full_name="Cleaner Two")

        # Job через контролируемый create_with_checklist
        self.job = Job.create_with_checklist(
            company=self.company,
            location=self.location,
            cleaner=self.cleaner_1,
            scheduled_date=date(2026, 1, 15),
            checklist_template=self.template,
        )

        self.items = list(JobChecklistItem.objects.filter(job=self.job).order_by("order", "id"))
        self.assertTrue(len(self.items) >= 2)

    def test_checklist_cannot_be_updated_by_other_cleaner(self):
        # переводим job в in_progress, чтобы упереться именно в Forbidden
        self.job.check_in()

        item = self.items[0]
        req = _json_request(
            self.rf,
            "POST",
            f"/jobs/{self.job.id}/checklist/{item.id}/toggle",
            {"user_id": self.cleaner_2.id, "is_completed": True},
        )
        resp = views.checklist_item_toggle(req, job_id=self.job.id, item_id=item.id)

        self.assertEqual(resp.status_code, 403)
        payload = json.loads(resp.content.decode("utf-8"))
        self.assertFalse(payload["ok"])

    def test_checklist_cannot_be_updated_when_job_not_in_progress(self):
        # job по умолчанию scheduled
        item = self.items[0]
        req = _json_request(
            self.rf,
            "POST",
            f"/jobs/{self.job.id}/checklist/{item.id}/toggle",
            {"user_id": self.cleaner_1.id, "is_completed": True},
        )
        resp = views.checklist_item_toggle(req, job_id=self.job.id, item_id=item.id)

        self.assertEqual(resp.status_code, 400)
        payload = json.loads(resp.content.decode("utf-8"))
        self.assertFalse(payload["ok"])

    def test_bulk_update_marks_items_completed(self):
        self.job.check_in()

        data = {
            "user_id": self.cleaner_1.id,
            "items": [
                {"id": self.items[0].id, "is_completed": True},
                {"id": self.items[1].id, "is_completed": True},
            ],
        }
        req = _json_request(self.rf, "POST", f"/jobs/{self.job.id}/checklist/bulk", data)
        resp = views.checklist_bulk_update(req, job_id=self.job.id)

        self.assertEqual(resp.status_code, 200)
        payload = json.loads(resp.content.decode("utf-8"))
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["updated_count"], 2)

        self.items[0].refresh_from_db()
        self.items[1].refresh_from_db()
        self.assertTrue(self.items[0].is_completed)
        self.assertTrue(self.items[1].is_completed)

    def test_check_out_fails_if_required_items_not_completed(self):
        # В in_progress
        self.job.check_in()

        # Пытаемся check-out без чеклиста
        req = _json_request(
            self.rf,
            "POST",
            f"/jobs/{self.job.id}/check-out",
            {"user_id": self.cleaner_1.id, "latitude": 25.2048, "longitude": 55.2708},
        )
        resp = views.job_check_out(req, job_id=self.job.id)

        self.assertEqual(resp.status_code, 400)
        payload = json.loads(resp.content.decode("utf-8"))
        self.assertFalse(payload["ok"])
