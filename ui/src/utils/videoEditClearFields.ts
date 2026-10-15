export function videoEditClearFields(date: string, studioId: number | undefined, productionDate: string): string[] {
  return [!date && "date", studioId === undefined && "studioId", !productionDate && "productionDate"].filter(
    (field): field is string => Boolean(field),
  );
}
