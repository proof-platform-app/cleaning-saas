from apps.accounts.models import Company
from apps.locations.models import ChecklistTemplate, ChecklistTemplateItem


def run():
    # Берём нашу тестовую компанию
    company = Company.objects.get(name="Dev Company")

    # Берём шаблон "Standard Cleaning"
    template = ChecklistTemplate.objects.get(
        company=company,
        name="Standard Cleaning",
    )

    # Полностью очищаем старые пункты
    ChecklistTemplateItem.objects.filter(template=template).delete()

    # Новые 6 пунктов как в Lovable
    items = [
        "Vacuum all floors",
        "Mop kitchen and bathrooms",
        "Clean windows and mirrors",
        "Dust all surfaces",
        "Empty trash bins",
        "Sanitize door handles",
    ]

    for order, text in enumerate(items):
        ChecklistTemplateItem.objects.create(
            template=template,
            order=order,
            text=text,
            is_required=True,
        )

    print("Standard Cleaning checklist reset to 6 items.")


if __name__ == "__main__":
    run()
