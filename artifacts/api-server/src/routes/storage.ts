import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';

import { ObjectPermission } from '../lib/objectAcl';
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function hasAuthenticatedSession(
  req: Request,
): req is Request & { isAuthenticated: () => boolean } {
  if (
    !('isAuthenticated' in req) ||
    typeof req.isAuthenticated !== 'function'
  ) {
    return false;
  }

  return req.isAuthenticated();
}

/**
 * POST /storage/upload
 *
 * Accept a base64-encoded image from the client, store it in the reference_photos
 * table, and return an objectPath that can be used as a reference image for story
 * generation.  Body: { data: "data:<mime>;base64,<...>", name?: string }
 */
router.post('/storage/upload', async (req: Request, res: Response) => {
  const { data, name } = req.body ?? {};
  if (!data || typeof data !== 'string') {
    res.status(400).json({ error: 'Missing data field (base64 data URL)' });
    return;
  }
  try {
    const id = randomUUID();
    await db.execute(sql`INSERT INTO reference_photos (id, data_url) VALUES (${id}, ${data})`);
    res.json({ objectPath: `/ref-photos/${id}` });
  } catch (error) {
    req.log.error({ err: error }, 'Error storing reference photo');
    res.status(500).json({ error: 'Failed to store image' });
  }
});

/**
 * GET /ref-photos/:id
 *
 * Serve a reference photo stored as a base64 data URL in the reference_photos table.
 */
router.get('/ref-photos/:id', async (req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`SELECT data_url FROM reference_photos WHERE id = ${req.params.id}`,
    );
    const row = result.rows[0];
    if (!row?.data_url) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const dataUrl = row.data_url as string;
    // Parse "data:<mime>;base64,<payload>"
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      res.status(500).json({ error: 'Corrupt image data' });
      return;
    }
    const [, contentType, payload] = match;
    const buffer = Buffer.from(payload, 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buffer);
  } catch (error) {
    req.log.error({ err: error }, 'Error serving reference photo');
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 * Requires auth middleware so public callers cannot mint write-capable URLs.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile =
      await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, 'Object not found');
      res.status(404).json({ error: 'Object not found' });
      return;
    }
    req.log.error({ err: error }, 'Error serving object');
    res.status(500).json({ error: 'Failed to serve object' });
  }
});

export default router;
