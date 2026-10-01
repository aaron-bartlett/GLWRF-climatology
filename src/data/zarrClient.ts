import * as zarr from "zarrita";
import { DATA_BASE_URL } from "./catalog";
import { decode } from "./decode";

export interface Slice {
  values: Float32Array; // row-major [height, width], row 0 = north
  width: number;
  height: number;
}

type Store = Awaited<ReturnType<typeof openStore>>;
const stores = new Map<string, Promise<Store>>();
const slices = new Map<string, Promise<Slice>>(); // slices are ~120 KB; add eviction only if needed

function openStore(path: string) {
  const url = new URL(`${DATA_BASE_URL}/${path}`, window.location.href).href;
  return zarr.withConsolidatedMetadata(new zarr.FetchStore(url));
}

/** Read one 2D field. `month` is a 0-based index, or null for variables without a month dimension. */
export function readSlice(storePath: string, variable: string, month: number | null): Promise<Slice> {
  const key = `${storePath}/${variable}/${month}`;
  let slice = slices.get(key);
  if (!slice) {
    slice = load(storePath, variable, month);
    slice.catch(() => slices.delete(key)); // allow retry after a failure
    slices.set(key, slice);
  }
  return slice;
}

async function load(storePath: string, variable: string, month: number | null): Promise<Slice> {
  if (!stores.has(storePath)) stores.set(storePath, openStore(storePath));
  const store = await stores.get(storePath)!;
  const arr = await zarr.open(zarr.root(store).resolve(variable), { kind: "array" });
  const { data, shape } = await zarr.get(arr, month === null ? null : [month, null, null]);
  const attrs = arr.attrs as { scale_factor?: number; add_offset?: number };
  const values = decode(
    data as Int16Array,
    attrs.scale_factor ?? 1,
    attrs.add_offset ?? 0,
    arr.fillValue as number | null,
  );
  return { values, height: shape[0], width: shape[1] };
}
