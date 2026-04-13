"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NemiPortfolioSiteStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const aws_cloudfront_2 = require("aws-cdk-lib/aws-cloudfront");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
class NemiPortfolioSiteStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { domainName, certificateArn } = props;
        // Resolve deployment source path for the site assets
        // - default: repo root `out/` (static export)
        // - override: `-c distPath=/abs/path` when invoking CDK
        // Use repo-root resolution based on process.cwd() (infra) so it works in ts-node and compiled runs
        const contextDist = this.node.tryGetContext('distPath');
        const defaultDist = path_1.default.resolve(process.cwd(), '../out');
        const distPath = contextDist ?? defaultDist;
        const hasDist = (0, fs_1.existsSync)(distPath);
        if (!hasDist) {
            // Do not fail app synthesis when only deploying other stacks.
            // We will simply skip the BucketDeployment if assets are missing.
            // When you intend to deploy this stack, build first or pass '-c distPath=/abs/path'.
            // eslint-disable-next-line no-console
            console.warn(`Static export not found at: ${distPath}. Skipping asset deployment for NemiPortfolioSiteStack. Build with 'npm run build' or pass '-c distPath=/abs/path' when deploying this stack.`);
        }
        const siteBucket = new aws_s3_1.Bucket(this, 'SiteBucket', {
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            autoDeleteObjects: false,
            cors: [
                {
                    allowedMethods: [aws_s3_1.HttpMethods.GET, aws_s3_1.HttpMethods.HEAD],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                },
            ],
        });
        const originAccessIdentity = new aws_cloudfront_1.OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: 'Access identity for the NextjsPortfoliosite static site bucket',
        });
        const responseHeadersPolicy = new aws_cloudfront_2.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
            customHeadersBehavior: {
                customHeaders: [
                    {
                        header: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                        override: true,
                    },
                    {
                        header: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp',
                        override: true,
                    },
                ],
            },
        });
        const originPolicy = new aws_cloudfront_2.OriginRequestPolicy(this, 'OriginRequestPolicy', {
            cookieBehavior: aws_cloudfront_2.OriginRequestCookieBehavior.none(),
            headerBehavior: aws_cloudfront_2.OriginRequestHeaderBehavior.none(),
            queryStringBehavior: aws_cloudfront_2.OriginRequestQueryStringBehavior.none(),
        });
        const defaultBehavior = {
            origin: aws_cloudfront_origins_1.S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
                originAccessIdentity,
            }),
            viewerProtocolPolicy: aws_cloudfront_2.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: aws_cloudfront_2.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachedMethods: aws_cloudfront_2.CachedMethods.CACHE_GET_HEAD_OPTIONS,
            cachePolicy: aws_cloudfront_2.CachePolicy.CACHING_OPTIMIZED,
            originRequestPolicy: originPolicy,
            responseHeadersPolicy,
            compress: true,
        };
        const errorResponses = [
            {
                httpStatus: 403,
                responseHttpStatus: 200,
                responsePagePath: '/index.html',
                ttl: aws_cdk_lib_1.Duration.minutes(5),
            },
            {
                httpStatus: 404,
                responseHttpStatus: 200,
                responsePagePath: '/index.html',
                ttl: aws_cdk_lib_1.Duration.minutes(5),
            },
        ];
        const distributionProps = {
            defaultBehavior,
            defaultRootObject: 'index.html',
            comment: 'nemi portfolio static site distribution',
            errorResponses,
        };
        const certificate = certificateArn
            ? acm.Certificate.fromCertificateArn(this, 'SiteCertificate', certificateArn)
            : undefined;
        if (!certificate) {
            // eslint-disable-next-line no-console
            console.warn('SITE_CERTIFICATE_ARN (or -c certificateArn=...) is not set. Deploy the certificate stack first, validate DNS, then redeploy the site stack with the ACM certificate ARN to attach n3mi.net aliases.');
        }
        const distribution = new aws_cloudfront_2.Distribution(this, 'SiteDistribution', {
            ...distributionProps,
            ...(certificate
                ? {
                    domainNames: [domainName, `www.${domainName}`],
                    certificate,
                    minimumProtocolVersion: aws_cloudfront_2.SecurityPolicyProtocol.TLS_V1_2_2021,
                }
                : {}),
        });
        if (hasDist) {
            new aws_s3_deployment_1.BucketDeployment(this, 'DeployWithInvalidation', {
                sources: [aws_s3_deployment_1.Source.asset(distPath)],
                destinationBucket: siteBucket,
                distribution,
                distributionPaths: ['/*'],
                cacheControl: [
                    aws_s3_deployment_1.CacheControl.fromString('public, max-age=0, must-revalidate'),
                ],
                prune: true,
                // Large model assets can make uploads slow; increase
                // Lambda memory to speed up uploads.
                memoryLimit: 2048,
                // Increase ephemeral storage to handle large deployments
                ephemeralStorageSize: aws_cdk_lib_1.Size.mebibytes(2048),
            });
        }
        new aws_cdk_lib_1.CfnOutput(this, 'BucketName', {
            value: siteBucket.bucketName,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'CloudFrontDistributionId', {
            value: distribution.distributionId,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'CloudFrontDomainName', {
            value: distribution.domainName,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'ConfiguredDomainName', {
            value: domainName,
        });
    }
}
exports.NemiPortfolioSiteStack = NemiPortfolioSiteStack;
