import { Injectable } from '@angular/core';

export interface SeahorseUser { id: string; name?: string; }

// Identity comes from the `seahorse_user` cookie the proxy sets per request (app.js's
// userCookieMiddleware). Upstream re-read that cookie on a 1s $interval because it can change under
// a live page; reading it on each call gets the same freshness without the timer. With
// ENABLE_AUTHORIZATION off the proxy stub issues the fixed id below, which is also the fallback when
// the cookie is missing or unparsable.
const NO_AUTH_USER: SeahorseUser = { id: '00000000-0000-0000-0000-000000000001' };

@Injectable({ providedIn: 'root' })
export class UserService {

  getSeahorseUser(): SeahorseUser {
    const user = this.readCookie('seahorse_user');
    return (user && user.id) ? user : NO_AUTH_USER;
  }

  private readCookie(name: string): SeahorseUser | null {
    const row = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
    if (!row) {
      return null;
    }
    try {
      return JSON.parse(decodeURIComponent(row.substring(name.length + 1)));
    } catch (e) {
      return null;
    }
  }
}
