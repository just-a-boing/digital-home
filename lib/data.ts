import { supabase } from "./supabase";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
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
  media_type: "image" | "video";
  caption: string | null;
  sort_order: number;
};

export type Collection = {
  id: string;
  home_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  cover_image: string | null;
  display_type: string;
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
  media_type: "image" | "video";
  caption: string | null;
  sort_order: number;
};

/* -------------------------------------------------------------------------- */
/* Memories                                                                   */
/* -------------------------------------------------------------------------- */

export async function getMemories(homeId: string) {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("home_id", homeId)
    .order("memory_date", { ascending: false });

  if (error) throw error;

  return data as Memory[];
}

export async function getMemory(id: string) {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as Memory;
}

export async function getMemoryMedia(memoryId: string) {
  const { data, error } = await supabase
    .from("memory_media")
    .select("*")
    .eq("memory_id", memoryId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data as MemoryMedia[];
}

/* -------------------------------------------------------------------------- */
/* On This Day                                                                */
/* -------------------------------------------------------------------------- */

export async function getOnThisDay(
  homeId: string,
  month: number,
  day: number
) {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("home_id", homeId)
    .order("memory_date", { ascending: false });

  if (error) throw error;

  return (data as Memory[]).filter((memory) => {
    const date = new Date(`${memory.memory_date}T00:00:00`);

    return (
      date.getMonth() + 1 === month &&
      date.getDate() === day
    );
  });
}

/* -------------------------------------------------------------------------- */
/* Add Memory                                                                 */
/* -------------------------------------------------------------------------- */

export async function addMemory(
  homeId: string,
  title: string,
  story: string,
  memoryDate: string
) {
  const { data, error } = await supabase
    .from("memories")
    .insert({
      home_id: homeId,
      title,
      story,
      memory_date: memoryDate,
    })
    .select()
    .single();

  if (error) throw error;

  return data as Memory;
}

/* -------------------------------------------------------------------------- */
/* Delete Memory                                                              */
/* -------------------------------------------------------------------------- */

export async function deleteMemory(id: string) {
  const { error } = await supabase
    .from("memories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Collections                                                                */
/* -------------------------------------------------------------------------- */

export async function getCollections(homeId: string) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("home_id", homeId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data as Collection[];
}

export async function getCollection(
  homeId: string,
  slug: string
) {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("home_id", homeId)
    .eq("slug", slug)
    .single();

  if (error) throw error;

  return data as Collection;
}

/* -------------------------------------------------------------------------- */
/* Collection Items                                                           */
/* -------------------------------------------------------------------------- */

export async function getCollectionItems(
  collectionId: string
) {
  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as CollectionItem[];
}

export async function getCollectionItem(
  id: string
) {
  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data as CollectionItem;
}

/* -------------------------------------------------------------------------- */
/* Collection Media                                                           */
/* -------------------------------------------------------------------------- */

export async function getCollectionMedia(
  itemId: string
) {
  const { data, error } = await supabase
    .from("collection_media")
    .select("*")
    .eq("item_id", itemId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data as CollectionMedia[];
}

/* -------------------------------------------------------------------------- */
/* Favorites                                                                  */
/* -------------------------------------------------------------------------- */

export async function getFavoriteItems(
  collectionId: string
) {
  const { data, error } = await supabase
    .from("collection_items")
    .select("*")
    .eq("collection_id", collectionId)
    .eq("favorite", true)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data as CollectionItem[];
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                    */
/* -------------------------------------------------------------------------- */

export function getMediaUrl(storagePath: string) {
  const { data } = supabase.storage
    .from("media")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}