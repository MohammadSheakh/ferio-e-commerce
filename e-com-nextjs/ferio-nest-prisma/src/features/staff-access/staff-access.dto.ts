import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { PERMISSIONS } from '@app/common';

const STAFF_ASSIGNABLE_PERMISSIONS = Object.values(PERMISSIONS).filter(
  (permission) => !permission.startsWith('staff.'),
);

export class InviteStaffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(40)
  @IsIn(STAFF_ASSIGNABLE_PERMISSIONS, { each: true })
  permissions: string[];
}

export class CompleteStaffAccessDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateStaffAccessDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(40)
  @IsIn(STAFF_ASSIGNABLE_PERMISSIONS, { each: true })
  permissions: string[];

  @IsIn(['active', 'inactive'])
  status: 'active' | 'inactive';
}
