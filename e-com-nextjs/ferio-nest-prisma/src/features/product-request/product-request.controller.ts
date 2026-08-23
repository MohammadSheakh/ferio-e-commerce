import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, Public, User } from '@app/common';
import { ProductRequestService } from './product-request.service';
import {
  CreateProductRequestDto,
  QueryProductRequestDto,
  UpdateProductRequestStatusDto,
} from './dto/product-request.dto';

@ApiTags('Product Requests')
@Controller('product-requests')
@UseGuards(AuthGuard)
export class ProductRequestController {
  constructor(private readonly service: ProductRequestService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a product request' })
  async createRequest(
    @Body() dto: CreateProductRequestDto,
    @User('userId') userId?: string,
  ) {
    const result = await this.service.createRequest(dto, userId);
    return {
      success: true,
      message: 'Product request submitted successfully.',
      data: result,
    };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all product requests (Admin)' })
  async getAllRequests(@Query() query: QueryProductRequestDto) {
    const result = await this.service.getAllRequests(query);
    return {
      success: true,
      message: 'Product requests retrieved successfully.',
      data: result,
    };
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product request status (Admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductRequestStatusDto,
  ) {
    const result = await this.service.updateStatus(id, dto);
    return {
      success: true,
      message: 'Product request status updated successfully.',
      data: result,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product request (Admin)' })
  async deleteRequest(@Param('id') id: string) {
    await this.service.deleteRequest(id);
    return {
      success: true,
      message: 'Product request deleted successfully.',
    };
  }
}
