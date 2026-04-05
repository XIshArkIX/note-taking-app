import { z } from "zod";

const isoDateRefinement = (value: string) =>
  Number.isNaN(Date.parse(value)) === false;

const nullableIsoDateSchema = z
  .union([z.string(), z.null()])
  .optional()
  .refine(
    (value) =>
      value === undefined || value === null || isoDateRefinement(value),
    {
      message: "Date must be a valid ISO date string.",
    },
  );

const noteTagTypeSchema = z.enum(["info", "warn", "error", "custom"]);

const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: "Custom tag color must be a hex value like #2563eb.",
  });

export const noteTagSchema = z
  .object({
    name: z.string().trim().min(1).max(32),
    type: noteTagTypeSchema,
    color: hexColorSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "custom" && !value.color) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom tags must include a color.",
        path: ["color"],
      });
    }

    if (value.type !== "custom" && value.color) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only custom tags can include a color.",
        path: ["color"],
      });
    }
  });

export const createNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    content: z.string().trim().min(1).max(10_000),
    tags: z.array(noteTagSchema).max(3).optional(),
    isPinned: z.boolean().optional(),
    startDate: z
      .string()
      .optional()
      .refine((value) => value === undefined || isoDateRefinement(value), {
        message: "Start date must be a valid ISO date string.",
      }),
    dueDate: nullableIsoDateSchema,
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.dueDate) {
      return;
    }

    const start = Date.parse(value.startDate);
    const due = Date.parse(value.dueDate);
    if (due < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date cannot be earlier than start date.",
        path: ["dueDate"],
      });
    }
  });

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().trim().min(1).max(10_000).optional(),
    tags: z.array(noteTagSchema).max(3).optional(),
    isPinned: z.boolean().optional(),
    startDate: z
      .string()
      .optional()
      .refine((value) => value === undefined || isoDateRefinement(value), {
        message: "Start date must be a valid ISO date string.",
      }),
    dueDate: nullableIsoDateSchema,
    deletedAt: nullableIsoDateSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Update payload cannot be empty.",
  })
  .superRefine((value, ctx) => {
    if (!value.startDate || !value.dueDate) {
      return;
    }

    const start = Date.parse(value.startDate);
    const due = Date.parse(value.dueDate);
    if (due < start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Due date cannot be earlier than start date.",
        path: ["dueDate"],
      });
    }
  });

export type CreateNoteSchema = z.infer<typeof createNoteSchema>;
export type UpdateNoteSchema = z.infer<typeof updateNoteSchema>;
