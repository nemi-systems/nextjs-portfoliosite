#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const certificate_stack_1 = require("../lib/certificate-stack");
const static_site_stack_1 = require("../lib/static-site-stack");
const app = new aws_cdk_lib_1.App();
const domainName = process.env.SITE_DOMAIN_NAME ?? 'n3mi.net';
const siteCertificateArn = app.node.tryGetContext('certificateArn') ??
    process.env.SITE_CERTIFICATE_ARN;
const defaultAccount = process.env.CDK_DEFAULT_ACCOUNT;
const defaultRegion = process.env.CDK_DEFAULT_REGION;
const certificateEnv = {
    account: process.env.CERTIFICATE_ACCOUNT ?? defaultAccount,
    region: process.env.CERTIFICATE_REGION ?? defaultRegion,
};
new certificate_stack_1.NemiPortfolioCertificateStack(app, 'NemiPortfolioCertificateStack', {
    env: certificateEnv,
    domainName,
});
const siteEnv = {
    account: process.env.SITE_ACCOUNT ?? defaultAccount,
    region: process.env.SITE_REGION ?? defaultRegion,
};
new static_site_stack_1.NemiPortfolioSiteStack(app, 'NemiPortfolioSiteStack', {
    env: siteEnv,
    domainName,
    certificateArn: siteCertificateArn,
});
