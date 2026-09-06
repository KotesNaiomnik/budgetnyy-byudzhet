import {
  Car,
  UtensilsCrossed,
  Zap,
  ShoppingCart,
  Film,
  Home,
  Package,
  HeartPulse,
  Scissors,
  Shirt,
  Dumbbell,
  Baby,
  Plane,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type CategoryKey =
  | "products"
  | "utilities"
  | "transport"
  | "restaurants"
  | "household"
  | "leisure"
  | "health"
  | "beauty"
  | "clothing"
  | "sport"
  | "kids"
  | "travel"
  | "electronics"
  | "other";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  /** Tailwind text color class for icons / badges. */
  color: string;
  /** Hex color used by recharts. */
  hex: string;
  icon: LucideIcon;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  products: {
    key: "products",
    label: "Продукты",
    color: "text-emerald-600",
    hex: "#10b981",
    icon: ShoppingCart,
  },
  utilities: {
    key: "utilities",
    label: "Коммуналка",
    color: "text-amber-600",
    hex: "#f59e0b",
    icon: Zap,
  },
  transport: {
    key: "transport",
    label: "Транспорт",
    color: "text-teal-600",
    hex: "#14b8a6",
    icon: Car,
  },
  restaurants: {
    key: "restaurants",
    label: "Рестораны",
    color: "text-rose-600",
    hex: "#f43f5e",
    icon: UtensilsCrossed,
  },
  household: {
    key: "household",
    label: "Бытовые товары",
    color: "text-orange-600",
    hex: "#f97316",
    icon: Package,
  },
  leisure: {
    key: "leisure",
    label: "Развлечения",
    color: "text-pink-600",
    hex: "#ec4899",
    icon: Film,
  },
  health: {
    key: "health",
    label: "Здоровье",
    color: "text-red-600",
    hex: "#ef4444",
    icon: HeartPulse,
  },
  beauty: {
    key: "beauty",
    label: "Красота",
    color: "text-fuchsia-600",
    hex: "#d946ef",
    icon: Scissors,
  },
  clothing: {
    key: "clothing",
    label: "Одежда",
    color: "text-violet-600",
    hex: "#8b5cf6",
    icon: Shirt,
  },
  sport: {
    key: "sport",
    label: "Спорт",
    color: "text-lime-600",
    hex: "#84cc16",
    icon: Dumbbell,
  },
  kids: {
    key: "kids",
    label: "Дети",
    color: "text-cyan-600",
    hex: "#06b6d4",
    icon: Baby,
  },
  travel: {
    key: "travel",
    label: "Путешествия",
    color: "text-sky-600",
    hex: "#0ea5e9",
    icon: Plane,
  },
  electronics: {
    key: "electronics",
    label: "Электроника",
    color: "text-indigo-600",
    hex: "#6366f1",
    icon: Smartphone,
  },
  other: {
    key: "other",
    label: "Прочее",
    color: "text-slate-500",
    hex: "#64748b",
    icon: Home,
  },
};

export const CATEGORY_LIST: CategoryDef[] = Object.values(CATEGORIES);

/** Resolve a stored category string to a CategoryDef (falls back to "other"). */
export function resolveCategory(key: string | null | undefined): CategoryDef {
  if (key && key in CATEGORIES) return CATEGORIES[key as CategoryKey];
  return CATEGORIES.other;
}

/** Member color palette (cycled) for charts, avoiding indigo/blue. */
export const MEMBER_COLORS = [
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#14b8a6",
  "#ec4899",
  "#f97316",
  "#84cc16",
  "#a855f7",
];

// ============================================================================
// Category synonyms for chart grouping (copied from the bot's text.ts)
// Brands/services are kept as-is in storage but merged on the chart.
// ============================================================================

const CATEGORY_SYNONYMS: { match: string[]; canonical: string }[] = [
  { canonical: "Продукты", match: ["еда", "продукт", "продукты", "пятёрочк", "пятерочк", "магнит", "перекресток", "перекрёсток", "ашан", "лента", "метро кэш", "супермаркет", "молок", "хлеб", "овощ", "фрукт", "мяс", "рыб", "сыр", "бакалея", "гастроном", "продуктовый", "дикси", "верны", "спар", "монетка", "красное белое", "маркет", "сбермаркет", "самокат", "лукоморье", "агрокомплекс", "фермер", "рынок", "яиц", "яйца", "колбас", "масл", "сахар", "круп", "макарон", "напитк", "сок", "чай"] },
  { canonical: "Рестораны", match: ["ресторан", "кафе", "бар", "паб", "столовая", "бистро", "фастфуд", "фаст-фуд", "ростикс", "ростик", "kfc", "кфс", "бургер кинг", "бургер", "вкусно и точка", "вкусно", "макдоналдс", "макдак", "мак", "папа джонс", "додо пицца", "додо", "пицца", "пиццер", "суши", "роллы", "шаурма", "шаверма", "беляш", "блин", "кофейня", "старбакс", "starbucks", "домино", "теремок", "шоколадница", "ужин", "ланч", "перекус", "доставка еды", "яндекс еда"] },
  { canonical: "Транспорт", match: ["транспорт", "такси", "метро", "автобус", "троллейбус", "трамвай", "бензин", "топливо", "заправк", "парковка", "электричк", "поезд", "убер", "uber", "каршеринг", "ржд", "авиа", "самолёт", "самолет", "аэропорт", "проезд", "тройка", "маршрутк", "осаго", "каско", "автосервис", "шиномонтаж"] },
  { canonical: "Коммуналка", match: ["коммуналк", "жкх", "квартплат", "электричеств", "газ", "вода", "водоснабж", "отоплен", "мусор", "интернет", "связь", "телефон", "аренд", "счётчик", "счетчик", "роутер", "мтс", "билайн", "мегафон", "теле2", "yota", "ростелеком", "дом ру", "мобильн"] },
  { canonical: "Бытовые товары", match: ["быт", "хозяйств", "химия", "мыло", "порошок", "шампун", "зубн", "туалетн", "бумага", "салфетк", "прокладк", "подгузник", "ламп", "батарейк", "икея", "ikea", "полк", "посуда", "губк", "мочалк", "сковород", "кастрюл", "чистящ"] },
  { canonical: "Развлечения", match: ["развлеч", "досуг", "кино", "фильм", "билет", "концерт", "театр", "музык", "spotify", "спотифай", "подписк", "нетфликс", "netflix", "кинотеатр", "клуб", "выставк", "музей", "игра", "стим", "steam", "playstation", "psn", "xbox", "nintendo", "apple music", "яндекс плюс", "youtube premium", "kinopoisk", "кинопоиск", "okko"] },
  { canonical: "Здоровье", match: ["аптек", "лекарств", "таблетк", "витамин", "врач", "клиник", "больниц", "стоматолог", "медицин", "анализ", "узи", "мрт", "рентген", "справк", "массаж", "психолог", "терапевт", "хирург", "педиатр", "прививк", "дмс", "омс"] },
  { canonical: "Одежда", match: ["одежд", "обувь", "кроссовк", "куртк", "рубашк", "брюк", "платье", "зара", "zara", "h&m", "лэтуаль", "золот", "вещ", "футболк", "джинс", "пальто", "шапк", "шарф", "перчатк", "носк", "колготк", "бельё", "белье", "сумк", "рюкзак", "часы", " uniqlo", "ostin", "спортмастер", "adidas", "nike"] },
  { canonical: "Подарки", match: ["подарок", "подарк", "цветы", "букет", "сувенир", "открытк", "подарочн", "сюрприз", "роза", "тюльпан"] },
  { canonical: "Спорт", match: ["спорт", "фитнес", "зал", "тренажёр", "тренажер", "абонемент", "йог", "пилатес", "бассейн", "плаван", "плавание", "тренировк", "кроссфит", "бокс", "карате", "теннис", "велосипед", "ролик", "сноуборд", "лыж", "коньк", "протеин", "креатин", "спортпит"] },
  { canonical: "Красота", match: ["красот", "салон", "парикмахер", "стрижк", "укладк", "окрашив", "маникюр", "педикюр", "ногт", "лак", "бров", "ресниц", "эпиляц", "шугаринг", "косметолог", "чистк", "пилинг", "барбершоп", "борода", "крем", "скраб", "дух", "парфюм", "помад", "макияж"] },
  { canonical: "Дети", match: ["дети", "детск", "ребёнок", "ребенок", "малыш", "игрушк", "памперс", "подгузник", "питание детск", "смесь", "соска", "коляск", "кроватк", "автокресл", "горшок", "школьн", "тетрад", "учебник", "ранец", "пенал", "каникул", "секция детск", "кружок", "детский сад", "садик", "нян", "школа", "репетитор"] },
  { canonical: "Дом и ремонт", match: ["мебель", "диван", "кресл", "стол", "стул", "шкаф", "кровать", "матрас", "ремонт", "обои", "краск", "цемент", "гипс", "инструмент", "дрель", "шуруповёрт", "шуруповерт", "молоток", "плинтус", "дверь", "окно", "ламинат", "линолеум", "плитк", "сантехник", "раковин", "унитаз", "ванны", "смеситель", "провод", "розетк", "лестниц", "стройматериал"] },
  { canonical: "Питомцы", match: ["корм собак", "корм кошк", "корм питомц", "животн", "питом", "собак", "кошк", "кот", "щенок", "котён", "котен", "попуг", "хомяк", "аквариум", "рыбк", "черепах", "ветеринар", "ветклиник", "зоомагазин", "зоо", "поводок", "ошейник", "наполнитель", "лоток", "груминг"] },
  { canonical: "Образование", match: ["образовани", "курс", "обучение", "урок", "репетитор", "университет", "институт", "колледж", "магистратур", "аспирантур", "тренинг", "семинар", "вебинар", "степик", "stepik", "coursera", "udemy", "skillbox", "яндекс практикум", "нетолог", "хекслет", "английский", "язык", "ielts", "toefl", "егэ", "огэ"] },
  { canonical: "Путешествия", match: ["путешеств", "поездк", "отпуск", "отел", "гостиниц", "хостел", "база отдых", "тур", "туризм", "виз", "загранпаспорт", "авиабилет", "круиз", "дача", "booking", "островок", "аэрофлот", "s7", "победа", "tripster"] },
  { canonical: "Электроника", match: ["электроник", "телефон", "смартфон", "айфон", "iphone", "samsung", "самсунг", "xiaomi", "сяоми", "планшет", "ipad", "айпад", "ноутбук", "компьютер", "пк", "монитор", "клавиатур", "мыш", "наушник", "колонк", "зарядк", "кабел", "чехол", "powerbank", "роутер", "модем", "флешк", "ssd", "видеокарт", "процессор", "dns", "м.видео", "эльдорадо", "citilink"] },
  { canonical: "Налоги и штрафы", match: ["налог", "штраф", "пени", "госпошлин", "сбор", "комисси", "платёж", "платеж", "ипотек", "кредит", "займ", "мфо", "взнос", "страховк", "гибдд", "фнс"] },
  { canonical: "Канцелярия", match: ["канцеляр", "ручек", "ручк", "карандаш", "фломастер", "маркер", "тетрад", "блокнот", "папк", "степлер", "ножниц", "клей", "скотч", "принтер", "картридж", "стикер", "ежедневник"] },
];

function findCanonical(input: string): string | null {
  const s = input.toLowerCase();
  for (const group of CATEGORY_SYNONYMS) {
    for (const m of group.match) {
      if (s.includes(m)) return group.canonical;
    }
  }
  return null;
}

/**
 * Normalize a category for STORAGE: case-normalize only (no synonym merge).
 */
export function normalizeCategory(input: string): string {
  const t = (input ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "Прочее";
  const capped = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  return capped.slice(0, 40);
}

/**
 * Map a stored category to its canonical CHART group via the synonym table.
 * If no synonym matches, returns the case-normalized original.
 */
export function chartCategory(input: string): string {
  const t = (input ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "Прочее";
  // First: known English key → Russian label (products → Продукты).
  if (t in CATEGORIES) return CATEGORIES[t as keyof typeof CATEGORIES].label;
  // Second: synonym table (Ростикс → Рестораны).
  const canonical = findCanonical(t);
  if (canonical) return canonical;
  return normalizeCategory(t);
}
