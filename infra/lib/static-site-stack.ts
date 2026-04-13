import {
  Duration,
  RemovalPolicy,
  Size,
  Stack,
  StackProps,
  CfnOutput,
} from 'aws-cdk-lib'
import { Construct } from 'constructs'
import path from 'path'
import { existsSync } from 'fs'
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3'
import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront'
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment'
import {
  AllowedMethods,
  CachedMethods,
  CachePolicy,
  Distribution,
  SecurityPolicyProtocol,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
  BehaviorOptions,
  ErrorResponse,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'

export interface NemiPortfolioSiteStackProps extends StackProps {
  domainName: string
  certificateArn?: string
}

export class NemiPortfolioSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: NemiPortfolioSiteStackProps) {
    super(scope, id, props)
    const { domainName, certificateArn } = props

    // Resolve deployment source path for the site assets
    // - default: repo root `out/` (static export)
    // - override: `-c distPath=/abs/path` when invoking CDK
    // Use repo-root resolution based on process.cwd() (infra) so it works in ts-node and compiled runs
    const contextDist = this.node.tryGetContext('distPath') as string | undefined
    const defaultDist = path.resolve(process.cwd(), '../out')
    const distPath = contextDist ?? defaultDist

    const hasDist = existsSync(distPath)
    if (!hasDist) {
      // Do not fail app synthesis when only deploying other stacks.
      // We will simply skip the BucketDeployment if assets are missing.
      // When you intend to deploy this stack, build first or pass '-c distPath=/abs/path'.
      // eslint-disable-next-line no-console
      console.warn(
        `Static export not found at: ${distPath}. Skipping asset deployment for NemiPortfolioSiteStack. Build with 'npm run build' or pass '-c distPath=/abs/path' when deploying this stack.`,
      )
    }

    const siteBucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    })

    const originAccessIdentity = new OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: 'Access identity for the NextjsPortfoliosite static site bucket',
    })

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
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
    })

    const originPolicy = new OriginRequestPolicy(this, 'OriginRequestPolicy', {
      cookieBehavior: OriginRequestCookieBehavior.none(),
      headerBehavior: OriginRequestHeaderBehavior.none(),
      queryStringBehavior: OriginRequestQueryStringBehavior.none(),
    })

    const defaultBehavior: BehaviorOptions = {
      origin: S3BucketOrigin.withOriginAccessIdentity(siteBucket, {
        originAccessIdentity,
      }),
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      originRequestPolicy: originPolicy,
      responseHeadersPolicy,
      compress: true,
    }

    const errorResponses: ErrorResponse[] = [
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.minutes(5),
      },
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: Duration.minutes(5),
      },
    ]

    const distributionProps = {
      defaultBehavior,
      defaultRootObject: 'index.html',
      comment: 'nemi portfolio static site distribution',
      errorResponses,
    } as const

    const certificate = certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'SiteCertificate', certificateArn)
      : undefined

    if (!certificate) {
      // eslint-disable-next-line no-console
      console.warn(
        'SITE_CERTIFICATE_ARN (or -c certificateArn=...) is not set. Deploy the certificate stack first, validate DNS, then redeploy the site stack with the ACM certificate ARN to attach n3mi.net aliases.',
      )
    }

    const distribution = new Distribution(this, 'SiteDistribution', {
      ...distributionProps,
      ...(certificate
        ? {
            domainNames: [domainName, `www.${domainName}`],
            certificate,
            minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
          }
        : {}),
    })

    if (hasDist) {
      new BucketDeployment(this, 'DeployWithInvalidation', {
        sources: [Source.asset(distPath)],
        destinationBucket: siteBucket,
        distribution,
        distributionPaths: ['/*'],
        cacheControl: [
          CacheControl.fromString('public, max-age=0, must-revalidate'),
        ],
        prune: true,
        // Large model assets can make uploads slow; increase
        // Lambda memory to speed up uploads.
        memoryLimit: 2048,
        // Increase ephemeral storage to handle large deployments
        ephemeralStorageSize: Size.mebibytes(2048),
      })
    }

    new CfnOutput(this, 'BucketName', {
      value: siteBucket.bucketName,
    })

    new CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
    })

    new CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.domainName,
    })

    new CfnOutput(this, 'ConfiguredDomainName', {
      value: domainName,
    })
  }
}
