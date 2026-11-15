import { looksPortuguese } from '../../../chrome-extension/src/utils/portuguese-hint.js';

describe('looksPortuguese', () => {
  test.each([
    'oi mae, esse e meu numero novo, me faz um pix urgente',
    'Olá, você pode fazer um pix pra mim? Não tenho minha senha agora.',
    'Seu banco informa: sua conta foi bloqueada, mas você pode resolver aqui hoje.'
  ])('detects Portuguese: %s', text => expect(looksPortuguese(text)).toBe(true));

  test.each([
    'Please verify your account now and enter your password.',
    'Hola, necesito que me envíes dinero hoy, es urgente por favor.',
    'Bonjour, veuillez confirmer votre compte immédiatement.',
    'Bitte bestätigen Sie Ihr Konto sofort.',
    'アカウントを確認してください',
    '', null, undefined, 42, 'oi'
  ])('rejects non-Portuguese or invalid input: %s', text => expect(looksPortuguese(text)).toBe(false));
});
