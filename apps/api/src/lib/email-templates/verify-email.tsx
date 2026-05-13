import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'

export interface VerifyEmailProps {
  otp: string
  preview: string
  greeting: string
  instruction: string
  expires: string
  footer: string
  ignore: string
}

// Inline styles are required for email clients; no CSS variables.
// Colors chosen to match the Kasero "Modern Mercantile" brand palette
// (Paper/Ink, terracotta accent) but rendered with concrete hex values
// because Gmail/Outlook strip :root custom properties.
const colors = {
  paper: '#FFFCF5',
  ink: '#1B1815',
  ink2: '#514B40',
  ink3: '#8B8475',
  hair: '#DCD2BB',
  brand: '#B5471F',
  codeBg: '#F6EFDF',
}

export function VerifyEmail(props: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={{ backgroundColor: colors.paper, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: colors.ink, margin: 0, padding: 0 }}>
        <Container style={{ padding: '40px 24px', maxWidth: 560 }}>
          <Heading style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 24, color: colors.brand, letterSpacing: '-0.01em' }}>Kasero</Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.5 }}>{props.greeting}</Text>
          <Text style={{ fontSize: 16, lineHeight: 1.5, color: colors.ink2 }}>{props.instruction}</Text>
          <Section style={{
            margin: '24px 0', padding: '24px', backgroundColor: colors.codeBg,
            borderRadius: 8, textAlign: 'center', border: `1px solid ${colors.hair}`,
          }}>
            <Text style={{ fontSize: 36, letterSpacing: 12, fontWeight: 700, margin: 0, color: colors.ink, fontFamily: 'ui-monospace, Menlo, monospace' }}>
              {props.otp}
            </Text>
          </Section>
          <Text style={{ fontSize: 14, color: colors.ink3 }}>{props.expires}</Text>
          <Text style={{ fontSize: 14, color: colors.ink3 }}>{props.ignore}</Text>
          <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${colors.hair}` }}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}
