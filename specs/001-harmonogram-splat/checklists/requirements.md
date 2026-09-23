# Specification Quality Checklist: Kalkulator harmonogramu spłat na POLSTR

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-23 (zaktualizowano 2026-09-23 po CR-A/B/C z
[dodatkowe_wymagania.md](../../../dodatkowe_wymagania.md))
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Specyfikacja świadomie wymienia endpoint `GET /api/harmonogram`, pliki `dane/*.json`
  oraz Vercel jako środowisko produkcyjne, ponieważ są to twarde ograniczenia biznesowe
  ze zgłoszenia ([BRIEF.md](../../../BRIEF.md)) i [karty uczestnika](../../../KARTA.md),
  a nie decyzje projektowe do podjęcia w fazie planowania.
- Liczba kontrolna z BRIEF.md jest jawnym kryterium akceptacji (SC-001) i wymaga testu
  domenowego w kolejnej fazie.
- CR-A (tryb nadpłaty), CR-B (rekompensata art. 40) i CR-C (konwersja WIBOR → POLSTR
  ze spreadem) są wpięte odpowiednio w User Story 4, 6 i 7 oraz w FR-008/FR-008a,
  FR-013–FR-016, FR-017–FR-021 i SC-006–SC-008. Każdy z tych zestawów zawiera własną
  liczbę kontrolną gotową do przełożenia na test domenowy.
