"""
╔══════════════════════════════════════════════════════════════════╗
║           POSHAK.PK — Product Importer  (v2.1)                 ║
║  Fetches & classifies products to match the live website's      ║
║  full taxonomy: Women / Men / Kids / Accessories + Jewelry      ║
╚══════════════════════════════════════════════════════════════════╝

HOW TO USE:
1. Open CMD / Terminal
2. Run:  pip install requests
3. Run:  python poshak_importer.py
4. A file called "products.csv" will appear on your Desktop
5. Open Google Sheets → File → Import → Upload → Replace current sheet
6. Website updates automatically in ~1 min!

GOOGLE SHEET — REQUIRED COLUMN HEADERS (copy-paste as row 1):
id,name,brand,price,category,color,fabric,occasion,image_url,product_url,badge,gender
"""

import re
import requests
import csv
import time
import os

# ── SETTINGS ──────────────────────────────────────────────────────────────────
PRODUCTS_PER_BRAND = 120
OUTPUT_FILE = os.path.join(os.path.expanduser("~"), "Desktop", "products.csv")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
}

# ── BRANDS ────────────────────────────────────────────────────────────────────
BRANDS = [
    {"name": "Sapphire",         "url": "https://pk.sapphireonline.pk"},
    {"name": "Limelight",        "url": "https://www.limelight.pk"},
    {"name": "Alkaram Studio",   "url": "https://www.alkaramstudio.com"},
    {"name": "Gul Ahmed",        "url": "https://www.gulahmedshop.com"},
    {"name": "Khaadi",           "url": "https://pk.khaadi.com"},
    {"name": "Bonanza Satrangi", "url": "https://www.bonanzaonline.com"},
    {"name": "Beechtree",        "url": "https://beechtree.pk"},
    {"name": "Zellbury",         "url": "https://www.zellbury.com"},
    {"name": "Cross Stitch",     "url": "https://www.crossstitchworld.com"},
    {"name": "Nishat Linen",     "url": "https://www.nishat.net"},
]

# ══════════════════════════════════════════════════════════════════════════════
#  TAXONOMY  — mirrors website GENDER_MAP exactly
# ══════════════════════════════════════════════════════════════════════════════
WOMEN_CATEGORIES       = ["Lawn", "Kurta", "Co-ords", "Pret / Ready to Wear",
                           "Luxury Pret", "Unstitched", "Shalwar Kameez",
                           "Formal", "Bridal", "Festive / Eid",
                           "Winter Collection", "Abaya"]
MEN_CATEGORIES         = ["Men's Kurta", "Shalwar Kameez Men", "Men's Formal",
                           "Men's Casual", "Waistcoat", "Men's Winter", "Sherwani"]
KIDS_CATEGORIES        = ["Girls Wear", "Boys Wear", "Kids Casual",
                           "Kids Formal", "Kids Lawn"]
ACCESSORIES_CATEGORIES = ["Jewelry", "Handbags", "Footwear", "Dupattas",
                           "Scarves", "Watches", "Sunglasses", "Clutches"]

# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def safe_tags(tags):
    """Normalise tags to a lowercase string regardless of type."""
    if isinstance(tags, list):
        return " ".join(str(t) for t in tags).lower()
    return str(tags).lower() if tags else ""


def _word_match(word, text):
    """Check if `word` appears as a whole word (word-boundary match) in `text`."""
    return bool(re.search(r'\b' + re.escape(word) + r'\b', text))


# ── Strong clothing signals that override accessories keywords ──────────────
# If ANY of these appear, the product is clothing, not accessories —
# even if it also mentions "dupatta", "shawl", etc.
_CLOTHING_SIGNALS = [
    "lawn", "suit", "kurta", "kameez", "pret", "ready to wear",
    "unstitched", "un-stitched", "3 piece", "3-piece", "3pc", "2 piece",
    "2-piece", "2pc", "co-ord", "coord", "gharara", "sharara", "lehenga",
    "frock", "dress", "abaya", "shirt", "trouser", "palazzo",
    "sherwani", "waistcoat", "shalwar", "bridal wear", "formal wear",
    "luxury pret", "cambric", "khaddar", "karandi",
]

# ── Unambiguous accessories keywords (safe for substring match) ─────────────
_ACC_KEYWORDS_SUBSTRING = [
    "jewel", "necklace", "earring", "jhumka", "choker", "bracelet",
    "bangle", "kundan", "meenakari", "tikka", "matha patti",
    "handbag", "clutch", "purse", "tote", "potli",
    "footwear", "shoes", "heels", "sandals", "khussa", "chappal",
    "sunglasses",
]

# ── Ambiguous accessories keywords (need word-boundary match) ───────────────
_ACC_KEYWORDS_WORDBOUNDARY = [
    "ring", "bag", "stole", "watch", "glasses",
]

# ── Dupatta / shawl / scarf — only accessories when standalone ──────────────
_DUPATTA_KEYWORDS = ["dupatta", "shawl", "scarf", "stole"]


def _is_standalone_accessory(title, product_type, tags):
    """
    Returns True only if the product is a standalone dupatta/shawl/scarf,
    NOT part of a clothing set (e.g., "3-Piece Lawn Suit with Dupatta").
    """
    text = f"{product_type} {title} {tags}".lower()

    # Must mention a dupatta-type keyword at all
    has_dupatta_kw = any(kw in text for kw in _DUPATTA_KEYWORDS)
    if not has_dupatta_kw:
        return False

    # If any clothing signal is present → it's a clothing set, not an accessory
    if any(kw in text for kw in _CLOTHING_SIGNALS):
        return False

    return True


def extract_gender(product_type, title, tags):
    """
    Returns: "Women" | "Men" | "Kids" | "Accessories"

    Strategy:
    1. If strong clothing signals are present → skip accessories entirely.
    2. Check accessories with safe substring + word-boundary matching.
    3. Check kids, men, women in order.
    """
    text = f"{product_type} {title} {tags}".lower()

    # ── STEP 1: If strong clothing signals exist, skip accessories ──────────
    has_clothing_signal = any(kw in text for kw in _CLOTHING_SIGNALS)

    # ── STEP 2: Accessories (only if no clothing signal) ────────────────────
    if not has_clothing_signal:
        # Unambiguous keywords — simple substring match is safe
        if any(kw in text for kw in _ACC_KEYWORDS_SUBSTRING):
            return "Accessories"

        # Ambiguous keywords — require word-boundary match
        if any(_word_match(kw, text) for kw in _ACC_KEYWORDS_WORDBOUNDARY):
            return "Accessories"

    # Even WITH clothing signals, standalone dupatta/shawl = Accessories
    if _is_standalone_accessory(title, product_type, tags):
        return "Accessories"

    # ── STEP 3: Kids ────────────────────────────────────────────────────────
    if any(kw in text for kw in [
        "kids", "children", "child", "baby", "infant",
        "toddler", "junior", "little", "mini",
    ]):
        return "Kids"

    # "girls" / "boys" alone can also indicate Kids
    if ("girls" in text or "boys" in text) and "women" not in text:
        return "Kids"

    # ── STEP 4: Men (guard: "women" contains "men") ────────────────────────
    if any(kw in text for kw in [
        "men's", "mens", "gents", "sherwani", "waistcoat", "baba suit",
    ]):
        if "women" not in text and "woman" not in text:
            return "Men"

    # standalone "men" word (not inside "women")
    if re.search(r'\bmen\b', text) and "women" not in text:
        return "Men"

    # ── STEP 5: Women signals (broad fallback) ─────────────────────────────
    if any(kw in text for kw in [
        "women", "woman", "ladies", "female",
        "lawn", "kurta", "kameez", "pret", "bridal", "bride",
        "gharara", "sharara", "lehenga", "abaya",
    ]):
        return "Women"

    # Default → Women (majority of Pakistani fashion products)
    return "Women"


def extract_category(product_type, title, tags, gender):
    """Maps a product to one of the website's exact category strings."""
    text = f"{product_type} {title} {tags}".lower()

    # ── ACCESSORIES ──────────────────────────────────────────────────────────
    if gender == "Accessories":
        if any(w in text for w in ["jewel", "necklace", "earring", "jhumka",
                                    "choker", "bracelet", "bangle",
                                    "kundan", "tikka", "matha"]):
            return "Jewelry"
        if _word_match("ring", text):
            return "Jewelry"
        if any(w in text for w in ["watch", "timepiece"]):
            return "Watches"
        if any(w in text for w in ["sunglasses", "glasses", "eyewear"]):
            return "Sunglasses"
        if any(w in text for w in ["clutch", "potli", "evening bag"]):
            return "Clutches"
        if any(w in text for w in ["handbag", "tote", "purse", "satchel"]):
            return "Handbags"
        if _word_match("bag", text):
            return "Handbags"
        if any(w in text for w in ["footwear", "shoes", "heels", "sandals",
                                    "khussa", "chappal", "flats", "pumps"]):
            return "Footwear"
        if any(w in text for w in ["scarf", "stole"]):
            return "Scarves"
        if any(w in text for w in ["dupatta", "shawl"]):
            return "Dupattas"
        return "Jewelry"  # safest fallback for Accessories

    # ── KIDS ─────────────────────────────────────────────────────────────────
    if gender == "Kids":
        is_girls  = any(w in text for w in ["girl", "girls"])
        is_boys   = any(w in text for w in ["boy", "boys"])
        is_formal = any(w in text for w in ["formal", "party", "special", "occasion"])
        if is_girls and is_formal:      return "Kids Formal"
        if is_girls and "lawn" in text: return "Kids Lawn"
        if is_girls:                    return "Girls Wear"
        if is_boys:                     return "Boys Wear"
        if is_formal:                   return "Kids Formal"
        if "lawn" in text:              return "Kids Lawn"
        return "Kids Casual"

    # ── MEN ──────────────────────────────────────────────────────────────────
    if gender == "Men":
        if any(w in text for w in ["sherwani", "achkan"]):   return "Sherwani"
        if any(w in text for w in ["waistcoat", "wasket"]):  return "Waistcoat"
        if any(w in text for w in ["winter", "khaddar", "karandi", "wool"]):
            return "Men's Winter"
        if any(w in text for w in ["formal", "suit", "blazer", "ceremony"]):
            return "Men's Formal"
        if any(w in text for w in ["shalwar kameez", "shalwar"]):
            return "Shalwar Kameez Men"
        if "kurta" in text:             return "Men's Kurta"
        return "Men's Casual"

    # ── WOMEN ─────────────────────────────────────────────────────────────────
    if any(w in text for w in ["unstitched", "unstiched", "un-stitched",
                                "3pc un", "2pc un", "unsewn"]):
        return "Unstitched"
    if any(w in text for w in ["luxury pret"]):           return "Luxury Pret"
    if any(w in text for w in ["bridal", "bride"]):       return "Bridal"
    if "abaya" in text:                                   return "Abaya"
    if any(w in text for w in ["co-ord", "coord", "co ord"]): return "Co-ords"
    if "lawn" in text:                                    return "Lawn"
    if "kurta" in text:                                   return "Kurta"
    if any(w in text for w in ["shalwar", "kameez"]):     return "Shalwar Kameez"
    if any(w in text for w in ["formal", "evening", "gown", "ceremony"]):
        return "Formal"
    if any(w in text for w in ["winter", "khaddar", "karandi", "velvet", "wool"]):
        return "Winter Collection"
    if any(w in text for w in ["eid", "festive"]):        return "Festive / Eid"
    return "Pret / Ready to Wear"


def extract_fabric(text):
    text = text.lower()
    checks = [
        ("raw silk",  "Raw Silk"),
        ("khaddar",   "Khaddar"),   ("khaddi",    "Khaddar"),
        ("karandi",   "Karandi"),
        ("jacquard",  "Jacquard"),
        ("organza",   "Organza"),
        ("cambric",   "Cambric"),
        ("georgette", "Chiffon"),   ("crepe",     "Chiffon"),
        ("viscose",   "Chiffon"),   ("chiffon",   "Chiffon"),
        ("velvet",    "Velvet"),
        ("linen",     "Linen"),
        ("lawn",      "Lawn"),
        ("silk",      "Silk"),
        ("net",       "Net"),
        ("slub",      "Cotton"),    ("cotton",    "Cotton"),
        ("brass",     "Metal"),     ("metal",     "Metal"),
        ("gold plat", "Metal"),     ("silver plat", "Metal"),
    ]
    for keyword, value in checks:
        if keyword in text:
            return value
    return "Cotton"


def extract_color(text):
    text = text.lower()
    checks = [
        ("gold",      "Gold"),       ("silver",    "Silver"),
        ("black",     "Black"),      ("white",     "White"),
        ("off white", "Beige"),      ("cream",     "Beige"),
        ("ivory",     "Beige"),
        ("navy",      "Navy"),       ("cobalt",    "Navy"),
        ("maroon",    "Maroon"),     ("burgundy",  "Maroon"),
        ("wine",      "Maroon"),
        ("crimson",   "Red"),        ("red",       "Red"),
        ("pink",      "Pink"),       ("rose",      "Pink"),
        ("hot pink",  "Pink"),
        ("peach",     "Peach"),      ("coral",     "Peach"),
        ("salmon",    "Peach"),
        ("sage",      "Mint"),       ("mint",      "Mint"),
        ("turquoise", "Teal"),       ("teal",      "Teal"),
        ("blue",      "Navy"),
        ("green",     "Mint"),
        ("mustard",   "Mustard"),    ("yellow",    "Mustard"),
        ("olive",     "Olive"),      ("khaki",     "Olive"),
        ("charcoal",  "Grey"),       ("grey",      "Grey"),
        ("gray",      "Grey"),
        ("beige",     "Beige"),
        ("lilac",     "Pastel"),     ("lavender",  "Pastel"),
        ("pastel",    "Pastel"),
        ("digital",   "Multi / Printed"),
        ("floral",    "Multi / Printed"),
        ("abstract",  "Multi / Printed"),
        ("printed",   "Multi / Printed"),
        ("multi",     "Multi / Printed"),
    ]
    for keyword, value in checks:
        if keyword in text:
            return value
    return "Multi / Printed"


def extract_occasion(text, gender, category):
    text = text.lower()
    # Category-driven overrides
    if category == "Bridal":                              return "Bridal"
    if category in ("Festive / Eid",):                    return "Eid / Festive"
    if category in ("Winter Collection", "Men's Winter"): return "Winter"

    if any(w in text for w in ["bridal", "bride"]):       return "Bridal"
    if any(w in text for w in ["wedding", "barat", "walima", "shaadi"]): return "Wedding"
    if any(w in text for w in ["eid", "festive"]):        return "Eid / Festive"
    if any(w in text for w in ["formal", "evening", "gown", "ceremony"]): return "Formal Event"
    if any(w in text for w in ["office", "work", "professional"]): return "Office / Work"
    if any(w in text for w in ["party", "night out", "cocktail"]): return "Party"
    if any(w in text for w in ["winter", "khaddar", "karandi", "velvet", "wool"]): return "Winter"

    # Accessories default based on category
    if gender == "Accessories":
        if category in ("Jewelry",):
            return "Eid / Festive"
        return "Casual / Everyday"

    return "Casual / Everyday"


def extract_badge(product):
    title    = str(product.get("title", "")).lower()
    tags     = safe_tags(product.get("tags", ""))
    variants = product.get("variants", [])

    if any(w in tags  for w in ["new", "new-arrival", "new arrival", "just-in"]): return "New"
    if any(w in tags  for w in ["sale", "discount", "clearance"]):                return "Sale"
    if any(w in title for w in ["luxury", "premium", "couture"]):                 return "Premium"
    if any(w in title for w in ["exclusive", "limited", "signature"]):            return "Exclusive"
    if any(w in title for w in ["eid", "festive"]):                               return "Festive"
    if any(w in title for w in ["bestseller", "best seller", "best-seller"]):     return "Bestseller"
    if any(w in title for w in ["trending", "viral"]):                            return "Trending"
    if any(v.get("compare_at_price") for v in variants):                          return "Sale"
    return ""


# ══════════════════════════════════════════════════════════════════════════════
#  VALIDATION — ensure gender ↔ category consistency
# ══════════════════════════════════════════════════════════════════════════════

GENDER_TO_CATEGORIES = {
    "Women":       set(WOMEN_CATEGORIES),
    "Men":         set(MEN_CATEGORIES),
    "Kids":        set(KIDS_CATEGORIES),
    "Accessories": set(ACCESSORIES_CATEGORIES),
}

CATEGORY_TO_GENDER = {}
for g, cats in GENDER_TO_CATEGORIES.items():
    for c in cats:
        CATEGORY_TO_GENDER[c] = g


def validate_and_fix(product):
    """
    Final safety net: if the assigned category doesn't belong to the
    assigned gender, fix the mismatch by trusting the category (since
    category classification is more specific than gender classification).
    """
    gender   = product["gender"]
    category = product["category"]

    # If category is valid for the gender, all good
    if category in GENDER_TO_CATEGORIES.get(gender, set()):
        return product

    # Category exists in a different gender → trust the category
    if category in CATEGORY_TO_GENDER:
        product["gender"] = CATEGORY_TO_GENDER[category]
        return product

    # Category is unknown → re-derive from defaults
    # This shouldn't happen, but just in case
    return product


# ══════════════════════════════════════════════════════════════════════════════
#  FETCH
# ══════════════════════════════════════════════════════════════════════════════

def fetch_brand(brand, limit):
    products = []
    page = 1
    name = brand["name"]
    print(f"\n  Fetching {name}...")

    while len(products) < limit:
        per_page = min(250, limit - len(products))
        url = f"{brand['url']}/products.json?limit={per_page}&page={page}"
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if resp.status_code == 404:
                print(f"  ⚠  {name} — 404: /products.json not found (may not be Shopify)")
                break
            if resp.status_code in (401, 403):
                print(f"  ⚠  {name} — Access blocked ({resp.status_code})")
                break
            if resp.status_code != 200:
                print(f"  ⚠  {name} — HTTP {resp.status_code}")
                break

            items = resp.json().get("products", [])
            if not items:
                break

            for item in items:
                title    = str(item.get("title", "")).strip()
                p_type   = str(item.get("product_type", "")).strip()
                tags     = safe_tags(item.get("tags", ""))
                handle   = str(item.get("handle", ""))
                images   = item.get("images", [])
                variants = item.get("variants", [])

                if not title or not images:
                    continue

                combined = f"{p_type} {title} {tags}"
                price = 0
                for v in variants:
                    try:
                        p = float(v.get("price", 0) or 0)
                        if p > 0:
                            price = p
                            break
                    except (ValueError, TypeError):
                        continue

                gender   = extract_gender(p_type, title, tags)
                category = extract_category(p_type, title, tags, gender)

                product = {
                    "id":          len(products) + 1,
                    "name":        title,
                    "brand":       name,
                    "price":       int(price),
                    "category":    category,
                    "color":       extract_color(combined),
                    "fabric":      extract_fabric(combined),
                    "occasion":    extract_occasion(combined, gender, category),
                    "image_url":   images[0]["src"],
                    "product_url": f"{brand['url']}/products/{handle}",
                    "badge":       extract_badge(item),
                    "gender":      gender,
                }

                # Final safety net — fix any gender↔category mismatch
                product = validate_and_fix(product)
                products.append(product)

            print(f"  ✓  Page {page}: {len(items)} items  |  total so far: {len(products)}")
            if len(items) < per_page:
                break
            page += 1
            time.sleep(0.5)

        except requests.exceptions.Timeout:
            print(f"  ✗  {name} — Timed out"); break
        except requests.exceptions.ConnectionError:
            print(f"  ✗  {name} — Connection failed"); break
        except Exception as e:
            print(f"  ✗  {name} — Error: {e}"); break

    if products:
        g_counts = {}
        for p in products:
            g_counts[p["gender"]] = g_counts.get(p["gender"], 0) + 1
        summary = "  |  ".join(f"{g}: {n}" for g, n in sorted(g_counts.items()))
        print(f"  → Done: {len(products)} products  [ {summary} ]")
    else:
        print(f"  → 0 products from {name}")

    return products


# ══════════════════════════════════════════════════════════════════════════════
#  REPORT + SAVE
# ══════════════════════════════════════════════════════════════════════════════

FIELDNAMES = [
    "id", "name", "brand", "price", "category", "color",
    "fabric", "occasion", "image_url", "product_url", "badge", "gender",
]


def save_csv(products, filename):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        for i, p in enumerate(products, 1):
            p["id"] = i
            writer.writerow(p)
    print(f"\n  ✓  Saved {len(products)} products → {filename}")


def print_report(all_products):
    print("\n" + "═" * 64)
    print("  IMPORT REPORT")
    print("═" * 64)
    print(f"  Total products:  {len(all_products)}\n")
    for gender in ["Women", "Men", "Kids", "Accessories"]:
        group = [p for p in all_products if p["gender"] == gender]
        if not group:
            continue
        print(f"  {gender} ({len(group)})")
        by_cat = {}
        for p in group:
            by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1
        for cat, n in sorted(by_cat.items(), key=lambda x: -x[1]):
            print(f"    ├─ {cat:<32} {n}")
        print()
    print("═" * 64)


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("═" * 64)
    print("  POSHAK.PK  Product Importer  v2.1")
    print("═" * 64)
    print(f"\n  Max products per brand: {PRODUCTS_PER_BRAND}")
    print(f"  Output: {OUTPUT_FILE}\n")

    all_products = []
    failed = []

    for brand in BRANDS:
        result = fetch_brand(brand, PRODUCTS_PER_BRAND)
        if result:
            all_products.extend(result)
        else:
            failed.append(brand["name"])
        time.sleep(1)

    print_report(all_products)

    if failed:
        print("  Brands that returned 0 products:")
        for b in failed:
            print(f"    ✗  {b}")
        print()

    if all_products:
        save_csv(all_products, OUTPUT_FILE)
        print("""
  ─────────────────────────────────────────────────────────────
  NEXT STEPS — import into Google Sheets:

  1. Make sure Row 1 of your sheet has EXACTLY these headers
     (copy & paste this line as row 1):

     id,name,brand,price,category,color,fabric,occasion,image_url,product_url,badge,gender

  2. File → Import → Upload → select products.csv (Desktop)
  3. Choose "Replace current sheet" → click Import Data
  4. Your website updates in ~1 minute!
  ─────────────────────────────────────────────────────────────
        """)
    else:
        print("\n  No products fetched.")
        print("  Most brands may have blocked their product API.")
        print("  Try adding products manually to your Google Sheet.")


if __name__ == "__main__":
    main()
