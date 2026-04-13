#!/usr/bin/env node
import 'source-map-support/register'
import { App, Environment } from 'aws-cdk-lib'
import { NemiPortfolioCertificateStack } from '../lib/certificate-stack'
import { NemiPortfolioSiteStack } from '../lib/static-site-stack'

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
