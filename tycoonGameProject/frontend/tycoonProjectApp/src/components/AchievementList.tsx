import type { AchievementDTO } from "../types/api";

interface AchievementListProps {
  achievements: readonly AchievementDTO[];
}

export function AchievementList({ achievements }: AchievementListProps) {
  if (achievements.length === 0) return null;
  return (
    <section aria-label="Achievements">
      <h2>Achievements</h2>
      <ul>
        {achievements.map((a) => (
          <li key={a.slug}>
            <strong>{a.name}</strong> — {a.description}
          </li>
        ))}
      </ul>
    </section>
  );
}