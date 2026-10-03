import { DEFAULT_CATEGORY, getCategoryRegistry } from "@/lib/expenseCategories";

// Keyword → category hints (Bengali + common English spellings)
const KEYWORD_MAP: Record<string, string[]> = {
  "বাজার": [
    "বাজার", "চাল", "ডাল", "তেল", "পিঁয়াজ", "পিয়াজ", "আলু", "সবজি", "মাছ", "মাংস", "গরু", "খাসি", "মুরগি",
    "ডিম", "দুধ", "মসলা", "নুন", "লবণ", "চিনি", "আটা", "ময়দা", "ভুট্টা", "শাক", "ফল", "আম", "কলা",
    "রসুন", "আদা", "হলুদ", "মরিচ", "জিরা", "সয়াবিন", "দোকান", "মুদি", "grocery", "bazar", "market",
  ],
  "যাতায়াত": [
    "রিকশা", "সিএনজি", "বাস", "ভাড়া", "উবার", "পাঠাও", "ট্রেন", "লঞ্চ", "লঞ্চ", "মেট্রো", "ট্যাক্সি",
    "জ্বালানি", "পেট্রোল", "অক্টেন", "ডিজেল", "টোল", "পার্কিং", "cng", "bus", "uber", "pathao", "fuel", "petrol",
  ],
  "বিল": [
    "বিদ্যুৎ", "বিদ্যুত", "গ্যাস", "পানি", "পানির বিল", "ইলেকট্রিক", "ওয়াসা", "ডিপিডিসি", "বাসা ভাড়া",
    "ভাড়া বিল", "সার্ভিস চার্জ", "electricity", "gas bill", "water bill", "rent", "wasa", "dpdc",
  ],
  "চিকিৎসা": [
    "ডাক্তার", "ঔষধ", "ওষুধ", "মেডিসিন", "ফার্মেসি", "হাসপাতাল", "ক্লিনিক", "টেস্ট", "পরীক্ষা ফি",
    "অ্যাম্বুলেন্স", "সিরাপ", "ট্যাবলেট", "ইনজেকশন", "doctor", "medicine", "hospital", "pharmacy",
  ],
  "খাবার": [
    "রেস্টুরেন্ট", "হোটেল", "খাবার", "লাঞ্চ", "ডিনার", "বিরিয়ানি", "বার্গার", "পিজ্জা", "কফি", "চা",
    "নাস্তা", "সিঙ্গারা", "সমুচা", "পানি পুরি", "ফুচকা", "আইসক্রিম", "মিষ্টি", "কাচ্চি", "restaurant",
    "food", "lunch", "dinner", "coffee", "pizza", "burger",
  ],
  "পোশাক": [
    "শার্ট", "প্যান্ট", "শাড়ি", "লুঙ্গি", "পাঞ্জাবি", "জুতা", "স্যান্ডেল", "ব্যাগ", "কাপড়", "টেইলার্স",
    "লেডিস ব্যাগ", "shirt", "pant", "saree", "shoes", "cloth", "dress",
  ],
  "উপহার": [
    "উপহার", "গিফট", "জন্মদিন", "বিয়ে", "গায়ে হলুদ", "নামকরণ", "দাওয়াত", "বউভাত", "বেবি শাওয়ার",
    "gift", "birthday", "wedding",
  ],
  "মোবাইল/ইন্টারনেট": [
    "মোবাইল রিচার্জ", "রিচার্জ", "ফ্লেক্সি", "ইন্টারনেট", "ওয়াইফাই", "ডাটা", "এমবি", "জিবি", "গ্রামীণফোন",
    "রবি", "বাংলালিংক", "এয়ারটেল", "টেলিটক", "বিসিবিএল", "recharge", "internet", "wifi", "data pack",
  ],
  "শিক্ষা": [
    "বই", "খাতা", "কলম", "টিউশন", "পরীক্ষার ফি", "ভর্তি", "কোচিং", "স্কুল", "কলেজ", "বিশ্ববিদ্যালয়",
    "কোর্স", "কোর্স ফি", "book", "tuition", "school", "course", "exam fee",
  ],
  "ঋণ পরিশোধ": [
    "ঋণ", "কিস্তি", "লোন", "ইএমআই", "ধার পরিশোধ", "ঋণ পরিশোধ", "ব্যাংক ঋণ", "loan", "emi", "installment",
  ],
};

/**
 * Suggest a category from the expense description.
 * Only suggests among categories the user currently has enabled.
 */
export function suggestCategory(description: string): string | null {
  const text = description.trim().toLowerCase();
  if (!text) return null;

  const available = getCategoryRegistry().map((c) => c.key);

  let best: { key: string; score: number } | null = null;
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (!available.includes(category)) continue;
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score += kw.length; // longer match = stronger signal
    }
    if (score > 0 && (!best || score > best.score)) best = { key: category, score };
  }
  return best ? best.key : null;
}

export { DEFAULT_CATEGORY };
