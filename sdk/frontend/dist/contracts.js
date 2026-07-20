// ../types/contracts.g.ts
var EntityKinds = {
  Audio: "audio",
  Face: "face",
  Gallery: "gallery",
  Group: "group",
  Image: "image",
  Performer: "performer",
  Segment: "segment",
  Studio: "studio",
  Tag: "tag",
  Text: "text",
  Video: "video"
};
var EventKinds = {
  GalleryCreated: "gallery.created",
  GalleryDeleted: "gallery.deleted",
  GalleryUpdated: "gallery.updated",
  GroupCreated: "group.created",
  GroupDeleted: "group.deleted",
  GroupUpdated: "group.updated",
  ImageCreated: "image.created",
  ImageDeleted: "image.deleted",
  ImageUpdated: "image.updated",
  PerformerCreated: "performer.created",
  PerformerDeleted: "performer.deleted",
  PerformerUpdated: "performer.updated",
  RatingCreated: "rating.created",
  RatingDeleted: "rating.deleted",
  RatingUpdated: "rating.updated",
  ScanCompleted: "scan.completed",
  ScanStarted: "scan.started",
  StudioCreated: "studio.created",
  StudioDeleted: "studio.deleted",
  StudioUpdated: "studio.updated",
  TagCreated: "tag.created",
  TagDeleted: "tag.deleted",
  TagMerged: "tag.merged",
  TagUpdated: "tag.updated",
  VideoCreated: "video.created",
  VideoDeleted: "video.deleted",
  VideoUpdated: "video.updated"
};
var ExtensionActionKinds = {
  Bulk: "bulk",
  ContextMenu: "context-menu",
  Toolbar: "toolbar"
};
var UiComponentKeys = {
  ConfirmDelete: "confirm-delete",
  PerformerCard: "performer.card",
  PerformerEdit: "performer-edit",
  PerformerSelector: "performer-selector",
  SearchBar: "search.bar",
  TagSelector: "tag-selector",
  VideoEdit: "video-edit",
  VideoSelector: "video.selector"
};
var UiPageKeys = {
  Gallery: "gallery",
  Group: "group",
  Home: "home",
  Image: "image",
  Performer: "performer",
  Settings: "settings",
  Studio: "studio",
  Tag: "tag",
  Video: "video",
  Wildcard: "*"
};
var UiSlotKeys = {
  GalleryDetailActions: "gallery-detail-actions",
  GalleryDetailBottom: "gallery-detail-bottom",
  GalleryDetailMainBottom: "gallery-detail-main-bottom",
  GroupDetailActions: "group-detail-actions",
  GroupDetailBottom: "group-detail-bottom",
  GroupDetailMainBottom: "group-detail-main-bottom",
  GroupDetailSidebarBottom: "group-detail-sidebar-bottom",
  ImageDetailActions: "image-detail-actions",
  ImageDetailMainBottom: "image-detail-main-bottom",
  ImageDetailSidebarBottom: "image-detail-sidebar-bottom",
  ListPageToolbarEnd: "list-page-toolbar-end",
  PerformerDetailActions: "performer-detail-actions",
  PerformerDetailBottom: "performer-detail-bottom",
  StudioCardFooter: "studio-card-footer",
  StudioDetailActions: "studio-detail-actions",
  StudioDetailBottom: "studio-detail-bottom",
  StudioDetailSidebarBottom: "studio-detail-sidebar-bottom",
  TagCardFooter: "tag-card-footer",
  TagDetailActions: "tag-detail-actions",
  TagDetailBottom: "tag-detail-bottom",
  TagDetailSidebarBottom: "tag-detail-sidebar-bottom",
  VideoDetailActions: "video-detail-actions",
  VideoDetailMainBottom: "video-detail-main-bottom"
};
var UiZoneKeys = {
  Details: "details",
  Hero: "hero",
  SidebarRight: "sidebar-right"
};
export {
  EntityKinds,
  EventKinds,
  ExtensionActionKinds,
  UiComponentKeys,
  UiPageKeys,
  UiSlotKeys,
  UiZoneKeys
};
