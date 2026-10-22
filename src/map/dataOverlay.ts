import type { Variable } from "../data/catalog";
import type { Slice } from "../data/zarrClient";
import { buildLut, colorize, colorizeCategories } from "./colormap";

/** Colormap a slice into a PNG blob URL. The caller revokes it when replaced. */
export async function sliceToImageUrl(slice: Slice, variable: Variable, range: [number, number]): Promise<string> {
  const rgba = variable.categories
    ? colorizeCategories(slice.values, variable.colormap as string[])
    : colorize(slice.values, buildLut(variable.colormap), range);
  const canvas = new OffscreenCanvas(slice.width, slice.height);
  canvas.getContext("2d")!.putImageData(new ImageData(rgba, slice.width, slice.height), 0, 0);
  return URL.createObjectURL(await canvas.convertToBlob({ type: "image/png" }));
}
