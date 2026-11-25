# CineBook API (base: `/api/v1`)

Responses always look like `{ "success": true, "data": ..., "message": "..." }`. Lists add `pagination: { page, limit, total, pages }`. Errors: `{ "success": false, "message": "...", "errors": [{ "field", "msg" }] }`.
Protected routes need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | /auth/register | Public | Create account (role is always `user`) |
| POST | /auth/login | Public | Returns JWT + user |
| GET | /auth/me | Private | Current user |
| PUT | /auth/change-password | Private | `currentPassword`, `newPassword` |
| PUT | /users/profile | Private | Update own `name`, `phone` |
| GET | /users | Admin | List users. Query: page, limit, search, role, sort |
| PATCH | /users/:id/status | Admin | `{ isActive: true/false }` |
| GET | /movies | Public | Query: page, limit, search, genre, language, status, sort |
| GET | /movies/filters | Public | Available genres and languages |
| GET | /movies/:id | Public | Movie details |
| POST | /movies | Admin | Create movie |
| PUT | /movies/:id | Admin | Update movie |
| DELETE | /movies/:id | Admin | Soft delete (blocked if upcoming shows have bookings) |
| POST | /movies/:id/poster | Admin | multipart field `poster` (jpg/png/webp, 2 MB) |
| GET | /theatres | Public | Query: city |
| GET | /theatres/cities | Public | City list |
| POST / PUT / DELETE | /theatres(/:id) | Admin | Manage theatres (rows x seatsPerRow layout) |
| GET | /shows | Public | Query: movie, theatre, city, from, to, sort, page, limit. Future shows only by default |
| GET | /shows/:id | Public | Show with theatre layout + `bookedSeats` + `seatsLeft` |
| POST / PUT / DELETE | /shows(/:id) | Admin | Manage shows (no overlap per theatre) |
| POST | /bookings | Private | `{ showId, seats: ["A1","A2"] }`. 409 if a seat is already taken |
| GET | /bookings/my | Private | My bookings (paginated, `status` filter) |
| GET | /bookings/:id | Owner/Admin | One booking |
| PUT | /bookings/:id/cancel | Owner/Admin | Cancel and release seats (users: until 60 min before show) |
| GET | /bookings | Admin | All bookings |
| GET | /dashboard/stats | Admin | Revenue, tickets, bookings by day, top movies |

## Status codes
200 OK, 201 Created, 400 validation, 401 not logged in / bad token, 403 not allowed, 404 not found, 409 conflict (duplicate email, seat taken, overlapping show), 429 rate limit, 500 server error.
