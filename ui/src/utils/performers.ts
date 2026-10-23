import type { Performer } from "../api/types";
import type { EntityReferenceOption } from "../components/EntityReferenceSelector";

/** A performer as a selector option, from a full performer or the summary a video, image or gallery lists. */
export function toPerformerOption(
  performer: Pick<Performer, "id" | "name" | "favorite" | "disambiguation" | "imagePath">,
): EntityReferenceOption {
  return {
    id: performer.id,
    label: performer.name,
    favorite: performer.favorite,
    secondaryLabel: performer.disambiguation ? `(${performer.disambiguation})` : undefined,
    performerImagePath: performer.imagePath,
  };
}
