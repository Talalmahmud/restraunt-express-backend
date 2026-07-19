import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /** Phone or email */
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
