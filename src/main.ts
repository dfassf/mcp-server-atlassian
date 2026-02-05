import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { McpService } from './mcp/mcp.service';
import { LoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const logger = new LoggerService();
  logger.setContext('Bootstrap');

  try {
    logger.log('Starting MCP server...');
    
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    app.useLogger(logger);

    const mcpService = app.get(McpService);
    await mcpService.start();
    
    logger.log('MCP server started successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to start MCP server: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    process.exit(1);
  }
}

bootstrap();
