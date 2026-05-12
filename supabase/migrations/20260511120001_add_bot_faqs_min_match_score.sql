-- Add per-FAQ match score threshold to bot_faqs
-- Sprint 1 humanizacion: searchFAQ aplicara este umbral para evitar matches por prefijo
-- Default 1.0 requiere minimo 1 keyword exacta matcheada (o 2 palabras en pregunta)
-- Per-FAQ: clinica puede ajustar a 0.5 (mas permisivo) o 1.5+ (mas estricto) si lo necesita

ALTER TABLE bot_faqs
  ADD COLUMN min_match_score NUMERIC NOT NULL DEFAULT 1.0;
