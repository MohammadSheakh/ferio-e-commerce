import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  PlatformAuthGuard,
  PlatformPermissions,
} from './guards/platform-auth.guard';
import { MigrationOrchestratorService } from './services/migration-orchestrator.service';
import type { PlatformRequest } from './platform-request.type';

@Controller('platform')
@UseGuards(PlatformAuthGuard)
export class PlatformMigrationsController {
  constructor(private readonly migrations: MigrationOrchestratorService) {}

  @Post('migrations')
  @PlatformPermissions('migration:run')
  startMigration(
    @Body()
    body: {
      canaryOrganizationId?: string;
      concurrencyLimit?: number;
      failureThreshold?: number;
    },
    @Req() request: PlatformRequest,
  ) {
    return this.migrations.start({
      actorId: request.platformPrincipal?.platformUserId,
      canaryOrganizationId: body.canaryOrganizationId,
      concurrencyLimit: body.concurrencyLimit,
      failureThreshold: body.failureThreshold,
    });
  }

  @Get('migrations')
  @PlatformPermissions('migration:run')
  listMigrations() {
    return this.migrations.listRuns();
  }

  @Get('migrations/:runId')
  @PlatformPermissions('migration:run')
  getMigration(@Param('runId') runId: string) {
    return this.migrations.getRun(runId);
  }

  @Post('migrations/:runId/pause')
  @PlatformPermissions('migration:run')
  pauseMigration(@Param('runId') runId: string) {
    return this.migrations.pause(runId);
  }

  @Post('migrations/:runId/resume')
  @PlatformPermissions('migration:run')
  resumeMigration(@Param('runId') runId: string) {
    return this.migrations.resume(runId);
  }
}
