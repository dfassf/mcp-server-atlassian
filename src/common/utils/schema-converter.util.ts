import { z } from 'zod';
import { ZodRawShapeCompat, AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export type { JsonSchema as JsonSchemaType };

export class SchemaConverter {
  static jsonSchemaToZod(jsonSchema: JsonSchema): ZodRawShapeCompat {
    const shape: Record<string, AnySchema> = {};

    for (const [key, property] of Object.entries(jsonSchema.properties)) {
      const isRequired = jsonSchema.required?.includes(key) ?? false;
      let baseSchema: z.ZodTypeAny;

      switch (property.type) {
        case 'string':
          baseSchema = property.enum && property.enum.length > 0
            ? z.enum(property.enum as [string, ...string[]])
            : z.string();
          break;
        case 'number':
          baseSchema = z.number();
          break;
        case 'boolean':
          baseSchema = z.boolean();
          break;
        case 'array':
          baseSchema = z.array(z.unknown());
          break;
        default:
          baseSchema = z.unknown();
      }

      let finalSchema: z.ZodTypeAny = baseSchema;
      
      if (property.description) {
        finalSchema = finalSchema.describe(property.description);
      }

      if (!isRequired) {
        finalSchema = finalSchema.optional();
      }

      shape[key] = finalSchema as unknown as AnySchema;
    }

    return shape as ZodRawShapeCompat;
  }
}
