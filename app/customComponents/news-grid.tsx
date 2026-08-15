import { motion } from "framer-motion";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import BiasRatingIndicator from '@/app/customComponents/bias-rating'

const NewsGrid = () => {

    const NEWS_ITEMS = [
  {
    id: 1,
    source: "Reuters",
    timeAgo: "2m ago",
    title: "NASA successfully launches Artemis II mission to the Moon",
    description: "The Orion spacecraft launched from Kennedy Space Center, aiming to pave the way for future lunar exploration.",
    categories: ["Science", "Space"],
    biasValue: 0,
    biasLabel: "Neutral",
    imageUrl: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    source: "Bloomberg",
    timeAgo: "15m ago",
    title: "Markets rally as inflation data shows continued cooling",
    description: "The S&P 500 rises 1.2% as investors react to lower-than-expected inflation numbers and strong earnings.",
    categories: ["Business", "Economy"],
    biasValue: -40,
    biasLabel: "Left",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    source: "BBC",
    timeAgo: "32m ago",
    title: "Global leaders commit to tripling renewable energy capacity by 2030",
    description: "New landmark agreement signed at the Climate Summit aims to accelerate clean energy transition worldwide.",
    categories: ["Environment", "Politics"],
    biasValue: 0,
    biasLabel: "Neutral",
    imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    source: "TechCrunch",
    timeAgo: "1h ago",
    title: "AI startups raise record $8.2B in funding this quarter",
    description: "Investors continue to bet big on artificial intelligence as new applications emerge across industries.",
    categories: ["Technology", "Business"],
    biasValue: -50,
    biasLabel: "Left",
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    source: "The Washington Post",
    timeAgo: "1h ago",
    title: "Senate passes bipartisan bill on infrastructure investment",
    description: "The $550B bill focuses on transportation, broadband, and clean water projects across the country.",
    categories: ["Politics", "Business"],
    biasValue: 0,
    biasLabel: "Center",
    imageUrl: "https://images.unsplash.com/photo-1518622116087-0b533e498c3f?w=800&auto=format&fit=crop&q=80",
  },
  {
    id: 6,
    source: "Associated Press",
    timeAgo: "2h ago",
    title: "New study shows accelerating Arctic ice melt",
    description: "Researchers warn that current melt rates could exceed previous worst-case scenarios.",
    categories: ["Science", "Environment"],
    biasValue: 60,
    biasLabel: "Right",
    imageUrl: "https://images.unsplash.com/photo-1520638062828-091f09e38d7a?w=800&auto=format&fit=crop&q=80",
  },
]


    return (
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {NEWS_ITEMS.map((item) => (
                  <Link href={`/news/${item.id}`} key={item.id} className="block">
                  <motion.div
                    key={item.id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow group"
                  >
                    <div className="relative h-44 overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-500">
                          <span className="text-neutral-900 font-bold">{item.source}</span>
                          <span>•</span>
                          <span>{item.timeAgo}</span>
                        </div>
                        <Bookmark className="w-4 h-4 text-neutral-400 hover:text-neutral-900 cursor-pointer" />
                      </div>
                      
                      <h3 className="font-bold text-neutral-900 text-sm leading-snug mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      
                      <p className="text-xs text-neutral-500 line-clamp-3 mb-4 flex-1">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.categories.map(cat => (
                          <span key={cat} className="px-2 py-0.5 bg-[#F8FAFC] text-[#2563EB] rounded-md text-[10px] font-semibold border border-blue-100">
                            {cat}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-neutral-500 font-medium">Bias</span>
                          <span className={`font-bold ${
                            item.biasLabel === "Left" ? "text-blue-600" : 
                            item.biasLabel === "Right" ? "text-red-500" : "text-neutral-600"
                          }`}>{item.biasLabel}</span>
                        </div>
                        <div className="w-24">
                           <BiasRatingIndicator value={item.biasValue} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  </Link>
                ))}
              </div>
    )
}
export default NewsGrid