export type MediaType = "image" | "video";

export type CollectionDisplayType =
  | "gallery"
  | "masonry"
  | "video"
  | "moodboard"
  | "music"
  | "map"
  | "editorial";

/* -------------------------------------------------------------------------- */
/* Home                                                                       */
/* -------------------------------------------------------------------------- */

export type Home = {
  id: string;
  name: string;
  created_at: string;
};

export type HomeMember = {
  home_id: string;
  user_id: string;
};

/* -------------------------------------------------------------------------- */
/* Memories                                                                   */
/* -------------------------------------------------------------------------- */

export type Memory = {
  id: string;
  home_id: string;
  title: string;
  story: string | null;
  memory_date: string;
  created_at: string;
  updated_at: string;
};

export type MemoryMedia = {
  id: string;
  memory_id: string;
  storage_path: string;
  media_type: MediaType;
  caption: string | null;
  sort_order: number;
};

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

export type Collection = {
  id: string;
  home_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  cover_image: string | null;
  display_type: CollectionDisplayType;
  sort_order: number;
};

export type CollectionItem = {
  id: string;
  collection_id: string;
  title: string;
  description: string | null;
  notes: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type CollectionMedia = {
  id: string;
  item_id: string;
  storage_path: string;
  media_type: MediaType;
  caption: string | null;
  sort_order: number;
};

/* -------------------------------------------------------------------------- */
/* Tags                                                                       */
/* -------------------------------------------------------------------------- */

export type Tag = {
  id: string;
  home_id: string;
  name: string;
};

export type MemoryTag = {
  memory_id: string;
  tag_id: string;
};

export type CollectionItemTag = {
  item_id: string;
  tag_id: string;
};

/* -------------------------------------------------------------------------- */
/* For Her                                                                   */
/* -------------------------------------------------------------------------- */

export type ForHerEntryType =
  | "letter"
  | "things_i_love"
  | "never_forget"
  | "promise"
  | "future";

export type ForHerEntry = {
  id: string;
  home_id: string;
  type: ForHerEntryType;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/* -------------------------------------------------------------------------- */
/* User / Auth                                                                */
/* -------------------------------------------------------------------------- */

export type UserProfile = {
  id: string;
  email: string;
};