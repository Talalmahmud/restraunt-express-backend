export interface JwtPayload {
  sub: string;
  role: string;
  type: 'user' | 'employee';
}
