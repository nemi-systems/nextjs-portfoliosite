#!/usr/bin/env node
import 'source-map-support/register'
import { App, Environment } from 'aws-cdk-lib'
import { NemiPortfolioCertificateStack } from '../lib/certificate-stack'
import { NemiPortfolioSiteStack } from '../lib/static-site-stack'
import { Xand1ApiStack } from '../lib/xand1-api-stack'

const app = new App()
const domainName = process.env.SITE_DOMAIN_NAME ?? 'n3mi.net'
const siteCertificateArn =
  app.node.tryGetContext('certificateArn') ??
  process.env.SITE_CERTIFICATE_ARN

const defaultAccount = process.env.CDK_DEFAULT_ACCOUNT
const defaultRegion = process.env.CDK_DEFAULT_REGION

const certificateEnv: Environment = {
  account: process.env.CERTIFICATE_ACCOUNT ?? defaultAccount,
  region: process.env.CERTIFICATE_REGION ?? defaultRegion,
}

new NemiPortfolioCertificateStack(app, 'NemiPortfolioCertificateStack', {
  env: certificateEnv,
  domainName,
})

const siteEnv: Environment = {
  account: process.env.SITE_ACCOUNT ?? defaultAccount,
  region: process.env.SITE_REGION ?? defaultRegion,
}

new NemiPortfolioSiteStack(app, 'NemiPortfolioSiteStack', {
  env: siteEnv,
  domainName,
  certificateArn: siteCertificateArn,
})

new Xand1ApiStack(app, 'Xand1ApiStack', {
  env: siteEnv,
  allowedOrigins: [`https://xand1.${domainName}`, 'http://localhost:3000', 'http://localhost:3001'],
  bedrockModelId:
    app.node.tryGetContext('xand1BedrockModelId') ??
    process.env.XAND1_BEDROCK_MODEL_ID,
  categoryLabelThreshold:
    app.node.tryGetContext('xand1CategoryLabelThreshold') ??
    process.env.XAND1_CATEGORY_LABEL_THRESHOLD,
  anthropicApiKeySecretArn:
    app.node.tryGetContext('xand1AnthropicApiKeySecretArn') ??
    process.env.XAND1_ANTHROPIC_API_KEY_SECRET_ARN,
  anthropicModel:
    app.node.tryGetContext('xand1AnthropicModel') ??
    process.env.XAND1_ANTHROPIC_MODEL,
  openAiApiKeySecretArn:
    app.node.tryGetContext('xand1OpenAiApiKeySecretArn') ??
    process.env.XAND1_OPENAI_API_KEY_SECRET_ARN,
  openAiModel:
    app.node.tryGetContext('xand1OpenAiModel') ??
    process.env.XAND1_OPENAI_MODEL,
})
