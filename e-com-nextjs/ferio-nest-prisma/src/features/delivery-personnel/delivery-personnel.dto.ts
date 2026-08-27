import { IsEnum, IsNotEmpty, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export enum DeliveryVehicleTypeEnum {
  BIKE = 'BIKE',
  BICYCLE = 'BICYCLE',
  E_BIKE = 'E_BIKE',
  BUS = 'BUS',
  CUSTOM = 'CUSTOM',
  WALK = 'WALK',
}

export enum DeliveryPersonnelStatusEnum {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export class ApplyDeliveryPersonnelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  nidNumber: string;

  @IsEnum(DeliveryVehicleTypeEnum)
  @IsOptional()
  vehicleType?: DeliveryVehicleTypeEnum = DeliveryVehicleTypeEnum.BIKE;

  @IsString()
  @IsNotEmpty()
  operatingZone: string;

  @IsString()
  @IsOptional()
  drivingLicense?: string;

  @IsString()
  @IsNotEmpty()
  emergencyPhone: string;
}

export class CreateDeliveryPersonnelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  nidNumber?: string;

  @IsEnum(DeliveryVehicleTypeEnum)
  @IsOptional()
  vehicleType?: DeliveryVehicleTypeEnum = DeliveryVehicleTypeEnum.BIKE;

  @IsString()
  @IsOptional()
  operatingZone?: string;

  @IsString()
  @IsOptional()
  drivingLicense?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;
}

export class UpdateApprovalDto {
  @IsEnum(DeliveryPersonnelStatusEnum)
  status: DeliveryPersonnelStatusEnum;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  initialPassword?: string;
}

export class UpdateDeliveryPersonnelDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  nidNumber?: string;

  @IsEnum(DeliveryVehicleTypeEnum)
  @IsOptional()
  vehicleType?: DeliveryVehicleTypeEnum;

  @IsString()
  @IsOptional()
  operatingZone?: string;

  @IsString()
  @IsOptional()
  drivingLicense?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @IsEnum(DeliveryPersonnelStatusEnum)
  @IsOptional()
  status?: DeliveryPersonnelStatusEnum;
}

export class AssignOrderDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  deliveryPersonnelId: string;
}

export class UpdateDeliveryOrderStatusDto {
  @IsString()
  @IsNotEmpty()
  status: 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'DELIVERY_FAILED';

  @IsString()
  @IsOptional()
  note?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;
}

export class UpdateLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class QueryDeliveryPersonnelDto {
  @IsEnum(DeliveryPersonnelStatusEnum)
  @IsOptional()
  status?: DeliveryPersonnelStatusEnum;

  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
