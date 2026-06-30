import { AchievementCard } from "@/components/ui/achievement-card"

export default function DemoOne() {
  return (
    <AchievementCard
      highlightedAchievements={[
        { id: "highlight-1", name: "Wellness God", trigger: "streak", achievedAt: "2024-01-01T00:00:00Z", rarity: 8 },
        { id: "highlight-2", name: "10 day streak", trigger: "streak", achievedAt: "2024-01-01T00:00:00Z", rarity: 24 },
        { id: "highlight-3", name: "Chatbot King", trigger: "api", achievedAt: "2024-01-01T00:00:00Z", rarity: 5 },
      ]}
      achievements={[
        { id: "list-1", name: "Wellness God", description: "Meditate 30 days in a row", trigger: "streak", achievedAt: "2024-01-01T00:00:00Z" },
        { id: "list-2", name: "10 day streak", description: "Open app for 10 days", trigger: "streak", achievedAt: "2024-01-01T00:00:00Z", progress: 60 },
        { id: "list-3", name: "Chatbot King", description: "Chat with AI 500 times", trigger: "api", achievedAt: "2024-01-01T00:00:00Z" },
        { id: "list-4", name: "Fully Hydrated Bro", description: "Drink 5,000L of water total", trigger: "metric", achievedAt: "2024-01-01T00:00:00Z", progress: 32 },
      ]}
    />
  )
}
