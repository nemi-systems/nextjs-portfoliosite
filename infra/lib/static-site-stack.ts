import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Size,
  Stack,
  StackProps,
} from 'aws-cdk-lib'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import {
  AllowedMethods,
  BehaviorOptions,
  CachePolicy,
  CachedMethods,
  Distribution,
  ErrorResponse,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { OriginAccessIdentity } from 'aws-cdk-lib/aws-cloudfront'
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins'
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3'
import {
  BucketDeployment,
  CacheControl,
  Source,
} from 'aws-cdk-lib/aws-s3-deployment'
import { existsSync } from 'fs'
import path from 'path'
import { Construct } from 'constructs'
import hostedApps from '../../hosted-apps.json'

type ResponseHeadersProfile = 'standard'

interface HostedSiteConfig {
  id: string
  publicName: string
  artifactPath: string
  domainAliases: string[]
  defaultRootObject: string
  fallbackPagePath: string
  responseHeaders: ResponseHeadersProfile
}

interface HostedAppsManifest {
  sites: HostedSiteConfig[]
}

export interface NemiPortfolioSiteStackProps extends StackProps {
  domainName: string
  certificateArn?: string
}

const manifest = hostedApps as HostedAppsManifest

function logicalPrefix(id: string): string {
  return id
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function resolveDistPath(siteId: string, artifactPath: string, stack: Stack): string {
  const contextDist = stack.node.tryGetContext(`distPath:${siteId}`) as string | undefined
  return contextDist ?? path.resolve(process.cwd(), '..', artifactPath)
}

export class NemiPortfolioSiteStack extends Stack {
  constructor(scope: Construct, id: string, props: NemiPortfolioSiteStackProps) {
    super(scope, id, props)

    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'SiteCertificate', props.certificateArn)
      : undefined

    if (!certificate) {
      // eslint-disable-next-line no-console
      console.warn(
        'SITE_CERTIFICATE_ARN (or -c certificateArn=...) is not set. Distributions will use CloudFront hostnames until you redeploy with the ACM wildcard certificate.',
      )
    }

    const originPolicy = new OriginRequestPolicy(this, 'OriginRequestPolicy', {
      cookieBehavior: OriginRequestCookieBehavior.none(),
      headerBehavior: OriginRequestHeaderBehavior.none(),
      queryStringBehavior: OriginRequestQueryStringBehavior.none(),
    })

    for (const site of manifest.sites) {
      const prefix = logicalPrefix(site.id)
      const distPath = resolveDistPath(site.id, site.artifactPath, this)
      const hasDist = existsSync(distPath)

      if (!hasDist) {
        // eslint-disable-next-line no-console
        console.warn(
          `Build artifacts for ${site.id} were not found at ${distPath}. Skipping asset deployment for this site.`,
        )
      }

      const siteBucket = new Bucket(this, `${prefix}SiteBucket`, {
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

      const originAccessIdentity = new OriginAccessIdentity(this, `${prefix}OriginAccessIdentity`, {
        comment: `Access identity for ${site.publicName}`,
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
        compress: true,
      }

      const errorResponses: ErrorResponse[] = [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: site.fallbackPagePath,
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: site.fallbackPagePath,
          ttl: Duration.minutes(5),
        },
      ]

      const distribution = new Distribution(this, `${prefix}Distribution`, {
        defaultBehavior,
        defaultRootObject: site.defaultRootObject,
        comment: `${site.publicName} static site distribution`,
        errorResponses,
        ...(certificate
          ? {
              certificate,
              domainNames: site.domainAliases,
              minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
            }
          : {}),
      })

      if (hasDist) {
        const siteDeployment = new BucketDeployment(this, `${prefix}DeployWithInvalidation`, {
          sources: [Source.asset(distPath)],
          destinationBucket: siteBucket,
          distribution,
          distributionPaths: ['/*'],
          cacheControl: [
            CacheControl.fromString('public, max-age=0, must-revalidate'),
          ],
          prune: true,
          memoryLimit: 2048,
          ephemeralStorageSize: Size.mebibytes(2048),
        })
      }

      new CfnOutput(this, `${prefix}BucketName`, {
        value: siteBucket.bucketName,
      })

      new CfnOutput(this, `${prefix}CloudFrontDistributionId`, {
        value: distribution.distributionId,
      })

      new CfnOutput(this, `${prefix}CloudFrontDomainName`, {
        value: distribution.domainName,
      })

      new CfnOutput(this, `${prefix}ConfiguredDomainAliases`, {
        value: site.domainAliases.join(', '),
      })
    }
  }
}
