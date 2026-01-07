import { Instagram, Send, Users } from 'lucide-react';

const ContactSection = () => {
  const contacts = [
    {
      icon: Instagram,
      label: 'Instagram',
      handle: '@raxx_xt',
      url: 'https://instagram.com/raxx_xt',
    },
    {
      icon: Send,
      label: 'Telegram',
      handle: '@raxx_xt',
      url: 'https://t.me/raxx_xt',
    },
    {
      icon: Users,
      label: 'Support Group',
      handle: 'TEAMXT_support',
      url: 'https://t.me/TEAMXT_support',
    },
  ];

  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="container px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          <h3 className="text-lg font-semibold text-foreground">Connect With Us</h3>
          
          <div className="flex flex-wrap justify-center gap-4">
            {contacts.map((contact) => (
              <a
                key={contact.label}
                href={contact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-secondary hover:bg-primary/20 border border-border hover:border-primary/50 transition-all duration-300 group"
              >
                <contact.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">{contact.label}</p>
                  <p className="text-sm font-medium text-foreground">{contact.handle}</p>
                </div>
              </a>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            Made with ❤️ by <span className="gradient-text font-semibold">XT Builds</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default ContactSection;
