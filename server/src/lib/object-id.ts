import { z } from "zod";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export const objectId = z.string().regex(OBJECT_ID, "must be a valid id");
