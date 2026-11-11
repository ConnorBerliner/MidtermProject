import { useAppSelector } from "../store/hooks";
import { NodeCardContainer } from "./NodeCardContainer";

export function NodeListContainer() {
  const nodes = useAppSelector((s) => s.game.nodes);
  return (
    <section className="grid" aria-label="Resource nodes">
      {nodes.map((node) => (
        <NodeCardContainer key={node.slug} node={node} />
      ))}
    </section>
  );
}