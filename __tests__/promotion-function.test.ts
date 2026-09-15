import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/promote-submission-media/index.ts"),
  "utf8",
);

describe("promote-submission-media contract", () => {
  it("accepts an authenticated administrator and reads the submission", () => {
    expect(source).toContain('caller.auth.getUser()');
    expect(source).toContain('.from("profiles").select("role")');
    expect(source).toContain('profile?.role !== "admin"');
    expect(source).toContain('.from("solicitudes_propiedades")');
  });

  it("promotes images and MP4 paths from staging with deterministic destinations", () => {
    expect(source).toContain('const STAGING_BUCKET = "eyesite-staging"');
    expect(source).toContain('const PUBLIC_BUCKET = "eyesite-media"');
    expect(source).toContain('client.storage.from(STAGING_BUCKET).copy');
    expect(source).toContain('submissions/${requestId}/assets/');
    expect(source).toContain('"fotos", "fotos_pro", "videos"');
    expect(source).toContain('"video_url", "portada_url"');
  });

  it("does not duplicate existing public paths or promote private files", () => {
    expect(source).toContain('status: "reused"');
    expect(source).toContain('PRIVATE_BUCKET');
    expect(source).toContain('status: "skipped"');
  });

  it("returns controlled errors and never approves a request", () => {
    expect(source).toContain('"Solicitud no encontrada"');
    expect(source).toContain('"Solo administradores"');
    expect(source).toContain('promotion_complete: errors.length === 0');
    expect(source).toContain('approved: false');
    expect(source).not.toContain('admin_approve_property_request');
  });
});
