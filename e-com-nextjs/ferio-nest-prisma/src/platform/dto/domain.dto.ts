import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddCustomDomainDto {
  @IsString()
  @MinLength(3)
  @MaxLength(253)
  hostname!: string;
}

export class VerifyCustomDomainDto {
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  verificationToken!: string;
}
