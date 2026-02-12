# backend/apps/api/views.py

from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Company, User
from apps.locations.models import (
    Location,
    ChecklistTemplate,
    ChecklistTemplateItem,
)

from .views_auth import *  # noqa
from .views_cleaner import *  # noqa
from .views_company import *  # noqa
from .views_manager_company import *  # noqa
from .views_manager_jobs import *  # noqa
from .views_reports import *  # noqa


# === Default checklist templates for new companies ===

DEFAULT_CHECKLIST_TEMPLATES = [
    {
        "name": "Apartment – Standard (6 items)",
        "description": "Regular maintenance cleaning for occupied apartments.",
        "items": [
            {"text": "Vacuum all floors", "is_required": True},
            {"text": "Mop hard floors", "is_required": True},
            {"text": "Dust all surfaces", "is_required": True},
            {"text": "Clean bathroom fixtures", "is_required": True},
            {"text": "Wipe kitchen surfaces", "is_required": True},
            {"text": "Empty all trash bins", "is_required": True},
        ],
    },
    {
        "name": "Apartment – Deep (12 items)",
        "description": "Deep cleaning for move-in / move-out or periodic general cleaning.",
        "items": [
            {"text": "Vacuum all floors", "is_required": True},
            {"text": "Mop hard floors", "is_required": True},
            {"text": "Dust all reachable surfaces", "is_required": True},
            {"text": "Dust high surfaces (tops of wardrobes, shelves)", "is_required": True},
            {"text": "Clean bathroom fixtures (sink, toilet, shower, bathtub)", "is_required": True},
            {"text": "Descale taps and shower heads (if needed)", "is_required": False},
            {"text": "Wipe kitchen countertops and backsplash", "is_required": True},
            {
                "text": "Clean outside of kitchen appliances (fridge, oven, microwave)",
                "is_required": False,
            },
            {
                "text": "Clean inside microwave and oven (where applicable)",
                "is_required": False,
            },
            {
                "text": "Clean windows and mirrors (reachable from inside)",
                "is_required": True,
            },
            {"text": "Disinfect door handles and light switches", "is_required": True},
            {"text": "Empty all trash bins and replace liners", "is_required": True},
        ],
    },
    {
        "name": "Office – Standard (8 items)",
        "description": "Core office cleaning for work areas, meeting rooms, toilets and kitchen.",
        "items": [
            {
                "text": "Vacuum carpets and hard floors in work areas",
                "is_required": True,
            },
            {
                "text": "Wipe desks and work surfaces (without moving personal items)",
                "is_required": True,
            },
            {"text": "Clean meeting room tables and chairs", "is_required": True},
            {"text": "Empty all office trash bins", "is_required": True},
            {
                "text": "Sanitize high-touch points (door handles, switches, railings)",
                "is_required": True,
            },
            {
                "text": "Clean and restock toilets (sinks, toilets, supplies)",
                "is_required": True,
            },
            {
                "text": "Clean kitchen / coffee area surfaces (countertops, sink, tables)",
                "is_required": True,
            },
            {
                "text": "Tidy reception / entrance area (floor, desk, glass surfaces)",
                "is_required": True,
            },
        ],
    },
    {
        "name": "Villa – Full (12 items)",
        "description": "Full villa cleaning: living areas, bedrooms, bathrooms and terraces.",
        "items": [
            {"text": "Vacuum all floors in living areas", "is_required": True},
            {
                "text": "Mop hard floors (hallways, kitchen, bathrooms)",
                "is_required": True,
            },
            {
                "text": "Dust furniture and decor in living areas",
                "is_required": True,
            },
            {"text": "Clean glass tables and mirrors", "is_required": True},
            {
                "text": "Clean and disinfect all bathrooms (toilets, sinks, showers, bathtubs)",
                "is_required": True,
            },
            {
                "text": "Wipe kitchen countertops and backsplash",
                "is_required": True,
            },
            {"text": "Clean outside of kitchen appliances", "is_required": True},
            {
                "text": "Tidy and dust bedrooms (nightstands, dressers, headboards)",
                "is_required": True,
            },
            {"text": "Change bed linen (if requested)", "is_required": False},
            {
                "text": "Clean and sweep balconies / terraces (if accessible)",
                "is_required": False,
            },
            {
                "text": "Sanitize door handles, switches and railings (stairs)",
                "is_required": True,
            },
            {
                "text": "Empty all trash bins (indoor and outdoor where applicable)",
                "is_required": True,
            },
        ],
    },
]


def create_default_checklist_templates_for_company(company: Company) -> None:
    """
    Гарантирует, что у company есть базовые шаблоны чек-листов.

    Идемпотентная функция:
    - если у компании уже есть шаблоны с пунктами, ничего не делает;
    - если нужных шаблонов нет, создаёт их;
    - если шаблон есть, но без description, аккуратно дописывает его;
    - не создаёт дубликаты пунктов.
    """

    has_any_templates = ChecklistTemplate.objects.filter(
        company=company,
        items__isnull=False,  # related_name="items"
    ).exists()

    if has_any_templates:
        return

    for tmpl_spec in DEFAULT_CHECKLIST_TEMPLATES:
        template, created = ChecklistTemplate.objects.get_or_create(
            company=company,
            name=tmpl_spec["name"],
            defaults={
                "description": tmpl_spec.get("description", "") or "",
                "is_active": True,
            },
        )

        updated_fields: list[str] = []
        new_description = tmpl_spec.get("description", "") or ""
        if not template.description and new_description:
            template.description = new_description
            updated_fields.append("description")

        if not template.is_active:
            template.is_active = True
            updated_fields.append("is_active")

        if updated_fields:
            template.save(update_fields=updated_fields)

        if not template.items.exists():
            for order, item_spec in enumerate(tmpl_spec["items"], start=1):
                if isinstance(item_spec, str):
                    text = item_spec
                    is_required = True
                else:
                    text = item_spec.get("text", "").strip()
                    is_required = bool(item_spec.get("is_required", True))

                if not text:
                    continue

                ChecklistTemplateItem.objects.get_or_create(
                    template=template,
                    text=text,
                    defaults={
                        "order": order,
                        "is_required": is_required,
                    },
                )


class ManagerMetaView(APIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company = getattr(user, "company", None)

        if not company:
            return Response(
                {"detail": "Manager has no company."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1) гарантируем, что у компании есть дефолтные шаблоны
        create_default_checklist_templates_for_company(company)

        # 2) клинеры
        cleaners_qs = (
            User.objects.filter(
                company=company,
                role=User.ROLE_CLEANER,
                is_active=True,
            ).order_by("full_name", "id")
        )

        # 3) локации
        locations_qs = (
            Location.objects.filter(company=company, is_active=True)
            .order_by("name", "id")
        )

        # 4) шаблоны с пунктами
        templates_qs = (
            ChecklistTemplate.objects.filter(
                company=company,
                items__isnull=False,
            )
            .distinct()
            .order_by("id")
        )

        payload = {
            "cleaners": [
                {"id": c.id, "full_name": c.full_name, "phone": c.phone}
                for c in cleaners_qs
            ],
            "locations": [
                {
                    "id": l.id,
                    "name": l.name,
                    "address": getattr(l, "address", "") or "",
                }
                for l in locations_qs
            ],
            "checklist_templates": [],
        }

        for t in templates_qs:
            items_qs = t.items.order_by("order", "id")
            all_items = [item.text for item in items_qs]

            payload["checklist_templates"].append(
                {
                    "id": t.id,
                    "name": t.name,
                    "description": getattr(t, "description", "") or "",
                    "items": all_items,
                    "items_preview": all_items[:4],
                    "items_count": len(all_items),
                }
            )

        return Response(payload, status=status.HTTP_200_OK)
