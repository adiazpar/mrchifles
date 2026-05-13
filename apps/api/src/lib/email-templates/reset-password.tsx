import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from '@react-email/components'

export interface ResetPasswordProps {
  url: string
  preview: string
  greeting: string
  instruction: string
  cta: string
  expires: string
  ignore: string
  footer: string
}

const colors = {
  paper: '#FFFCF5',
  ink: '#1B1815',
  ink2: '#514B40',
  ink3: '#8B8475',
  hair: '#DCD2BB',
  brand: '#B5471F',
  brandText: '#FFFFFF',
}

export function ResetPassword(props: ResetPasswordProps) {
  return (
    <Html>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body style={{ backgroundColor: colors.paper, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: colors.ink, margin: 0, padding: 0 }}>
        <Container style={{ padding: '40px 24px', maxWidth: 560 }}>
          <Heading style={{ fontFamily: 'Georgia, serif', fontSize: 28, marginBottom: 24, color: colors.brand, letterSpacing: '-0.01em' }}>Kasero</Heading>
          <Text style={{ fontSize: 16, lineHeight: 1.5 }}>{props.greeting}</Text>
          <Text style={{ fontSize: 16, lineHeight: 1.5, color: colors.ink2 }}>{props.instruction}</Text>
          <Button href={props.url} style={{
            display: 'inline-block', padding: '12px 28px', marginTop: 16,
            backgroundColor: colors.brand, color: colors.brandText, borderRadius: 6,
            textDecoration: 'none', fontWeight: 600, fontSize: 15,
          }}>{props.cta}</Button>
          <Text style={{ fontSize: 14, color: colors.ink3, marginTop: 24 }}>{props.expires}</Text>
          <Text style={{ fontSize: 14, color: colors.ink3 }}>{props.ignore}</Text>
          <Text style={{ fontSize: 12, color: colors.ink3, marginTop: 32, paddingTop: 16, borderTop: `1px solid ${colors.hair}` }}>{props.footer}</Text>
        </Container>
      </Body>
    </Html>
  )
}
