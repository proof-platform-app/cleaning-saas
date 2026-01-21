from apps.accounts.models import Company
from apps.locations.models import ChecklistTemplate, ChecklistTemplateItem


def ensure_template(company, name: str, description: str, items: list[str]):
    """
    Создаёт ChecklistTemplate + ChecklistTemplateItem для компании,
    если ещё нет. Если есть — гарантирует наличие пунктов.
    """
    template, _ = ChecklistTemplate.objects.get_or_create(
        company=company,
        name=name,
        defaults={"description": description},
    )

    for order, text in enumerate(items):
        ChecklistTemplateItem.objects.get_or_create(
            template=template,
            order=order,  # поле order
            defaults={
                "text": text,
                "is_required": True,
            },
        )

    return template


def run():
    company = Company.objects.get(name="Dev Company")

    # 1) Standard Cleaning (6 items)
    standard_items = [
        "Vacuum all floors",
        "Mop kitchen and bathrooms",
        "Clean windows and mirrors",
        "Dust all surfaces",
        "Empty trash bins",
        "Sanitize door handles",
    ]

    ensure_template(
        company=company,
        name="Standard Cleaning",
        description="Standard apartment/house cleaning",
        items=standard_items,
    )

    # 2) Deep Cleaning (12 items)
    deep_items = [
        "Vacuum all floors",
        "Mop kitchen and bathrooms",
        "Clean windows and mirrors",
        "Dust all surfaces",
        "Empty trash bins",
        "Sanitize door handles",
        "Clean inside kitchen cabinets",
        "Degrease stove and oven exterior",
        "Scrub tile grout in bathroom",
        "Wipe baseboards and skirting boards",
        "Clean behind and under furniture",
        "Descale shower heads and faucets",
    ]

    ensure_template(
        company=company,
        name="Deep Cleaning",
        description="Deep cleaning with extra detailed tasks",
        items=deep_items,
    )

    # 3) Office Cleaning (8 items)
    office_items = [
        "Vacuum all office floors and carpets",
        "Wipe desks and work surfaces",
        "Disinfect keyboards and mice",
        "Empty all trash bins and replace liners",
        "Clean meeting room tables and chairs",
        "Wipe glass doors and partitions",
        "Clean and restock kitchen area",
        "Clean and restock restrooms",
    ]

    ensure_template(
        company=company,
        name="Office Cleaning",
        description="Office space cleaning",
        items=office_items,
    )

    print("Checklist templates seeded.")


# чтобы код выполнился при запуске через manage.py shell < ... 
if __name__ == "__main__":
    run()
