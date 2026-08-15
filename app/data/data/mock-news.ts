export interface NewsArticle {
  id: string
  source: string
  timeAgo: string
  readTime: string
  publishedAt: string
  title: string
  description: string
  content: string[]
  categories: string[]
  biasValue: number
  biasLabel: "Left" | "Neutral" | "Right" | "Mixed"
  biasDescription: string
  biasDistribution: {
    left: number
    neutral: number
    right: number
    mixed: number
  }
  keyPoints: string[]
  sourcesList: { name: string; type: string; url?: string }[]
  region: string
  imageUrl: string
  relatedArticles: { id: string; title: string; source: string; timeAgo: string; category: string; imageUrl: string }[]
}

export const MOCK_ARTICLES: NewsArticle[] = [
  {
    id: "1",
    source: "Reuters",
    timeAgo: "2m ago",
    readTime: "5 min read",
    publishedAt: "May 15, 2025, 9:15 AM",
    title: "NASA successfully launches Artemis II mission to the Moon",
    description: "The Orion spacecraft launched from Kennedy Space Center, aiming to pave the way for future lunar exploration.",
    content: [
      "Kennedy Space Center, FL — NASA's Artemis II mission lifted off successfully today at 9:15 AM EDT, marking a critical step forward in the agency's plan to return humans to the Moon.",
      "The Orion spacecraft, carried by the Space Launch System (SLS) rocket, blasted off from Launch Complex 39B. The mission will carry four astronauts on a 10-day test flight around the Moon and back, validating systems for future Artemis missions.",
      "\"Artemis II is about pushing the boundaries of exploration while preparing for humanity's next giant leap,\" said NASA Administrator Bill Nelson.",
      "The mission is part of NASA's Artemis program, which aims to establish a sustainable human presence on the Moon and prepare for future missions to Mars."
    ],
    categories: ["Science", "Space"],
    biasValue: 0,
    biasLabel: "Neutral",
    biasDescription: "This article is reported with balanced perspectives and minimal detectable bias.",
    biasDistribution: {
      left: 32,
      neutral: 64,
      right: 25,
      mixed: 28
    },
    keyPoints: [
      "Artemis II launched successfully from Kennedy Space Center.",
      "The mission will test systems with four astronauts on a 10-day lunar flight.",
      "Artemis program aims to establish a sustainable human presence on the Moon."
    ],
    sourcesList: [
      { name: "Reuters (Primary)", type: "Primary" },
      { name: "NASA Official Statement", type: "Official" },
      { name: "Space.com", type: "Media" }
    ],
    region: "United States",
    imageUrl: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80",
    relatedArticles: [
      {
        id: "2",
        title: "Artemis program: NASA's path back to the Moon",
        source: "BBC",
        timeAgo: "1h ago",
        category: "Science",
        imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: "3",
        title: "Inside the Orion spacecraft: Built for deep space",
        source: "Space.com",
        timeAgo: "2h ago",
        category: "Science",
        imageUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&auto=format&fit=crop&q=80"
      },
      {
        id: "4",
        title: "SLS rocket: The most powerful in the world",
        source: "TechCrunch",
        timeAgo: "3h ago",
        category: "Technology",
        imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&auto=format&fit=crop&q=80"
      }
    ]
  },
  {
    id: "2",
    source: "Bloomberg",
    timeAgo: "15m ago",
    readTime: "4 min read",
    publishedAt: "May 15, 2025, 9:00 AM",
    title: "Markets rally as inflation data shows continued cooling",
    description: "The S&P 500 rises 1.2% as investors react to lower-than-expected inflation numbers and strong earnings.",
    content: [
      "Wall Street saw a broad rally on Thursday as new economic data confirmed that consumer price inflation continued to cool through the previous quarter.",
      "The S&P 500 climbed 1.2%, while the tech-heavy Nasdaq Composite gained 1.6% following positive quarterly corporate earnings reports.",
      "Economists note that the sustained downward trend in inflation opens the door for anticipated federal interest rate adjustments later this year."
    ],
    categories: ["Business", "Economy"],
    biasValue: -40,
    biasLabel: "Left",
    biasDescription: "This article emphasizes consumer cost relief and economic policy impacts.",
    biasDistribution: {
      left: 55,
      neutral: 30,
      right: 15,
      mixed: 20
    },
    keyPoints: [
      "S&P 500 rises 1.2% on cooling inflation numbers.",
      "Corporate earnings beat consensus analyst estimates.",
      "Federal Reserve rate adjustments expected soon."
    ],
    sourcesList: [
      { name: "Bloomberg (Primary)", type: "Primary" },
      { name: "Federal Reserve Economic Data", type: "Data" }
    ],
    region: "United States",
    imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
    relatedArticles: [
      {
        id: "1",
        title: "NASA successfully launches Artemis II mission",
        source: "Reuters",
        timeAgo: "2m ago",
        category: "Science",
        imageUrl: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&auto=format&fit=crop&q=80"
      }
    ]
  }
]

export function getArticleById(id: string): NewsArticle {
  return MOCK_ARTICLES.find(article => article.id === id) || MOCK_ARTICLES[0]
}