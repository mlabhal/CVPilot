import React from 'react';
import { fullWidthStyle } from './styles';

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "Marie Dupont",
      role: "DRH, Tech Solutions",
      quote: "CVAnalyzer a révolutionné notre processus de recrutement. Nous économisons des heures de travail et trouvons de meilleurs candidats.",
      avatar: "/api/placeholder/60/60"
    },
    {
      id: 2,
      name: "Jean Martin",
      role: "Recruteur, Global Corp",
      quote: "Je peux désormais comparer efficacement des dizaines de candidats en quelques minutes. Un outil indispensable pour tout recruteur moderne.",
      avatar: "/api/placeholder/60/60"
    },
    {
      id: 3,
      name: "Sophie Bernard",
      role: "PDG, StartupLab",
      quote: "Cette solution nous a permis d'identifier des talents que nous aurions manqués avec nos méthodes traditionnelles. Un investissement qui a changé notre entreprise.",
      avatar: "/api/placeholder/60/60"
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-gray-50" style={fullWidthStyle}>
      <div className="w-full max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">Ce que nos clients disent</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez comment notre solution transforme le recrutement pour des entreprises de toutes tailles
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="bg-white p-8 rounded-xl shadow-md relative hover:shadow-lg transition-shadow"
            >
              <div className="mb-6">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 10H10C8.89543 10 8 10.8954 8 12V20C8 21.1046 8.89543 22 10 22H18C19.1046 22 20 21.1046 20 20V12C20 10.8954 19.1046 10 18 10Z" fill="#6366F1"/>
                  <path d="M18 26H10C8.89543 26 8 26.8954 8 28V36C8 37.1046 8.89543 38 10 38H18C19.1046 38 20 37.1046 20 36V28C20 26.8954 19.1046 26 18 26Z" fill="#6366F1"/>
                  <path d="M34 10H26C24.8954 10 24 10.8954 24 12V20C24 21.1046 24.8954 22 26 22H34C35.1046 22 36 21.1046 36 20V12C36 10.8954 35.1046 10 34 10Z" fill="#6366F1"/>
                  <path d="M34 26H26C24.8954 26 24 26.8954 24 28V36C8 37.1046 24.8954 38 26 38H34C35.1046 38 36 37.1046 36 36V28C36 26.8954 35.1046 26 34 26Z" fill="#6366F1"/>
                </svg>
              </div>
              <p className="text-gray-600 mb-6">"{testimonial.quote}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.avatar} 
                  alt={testimonial.name} 
                  className="w-12 h-12 rounded-full mr-4 object-cover"
                />
                <div>
                  <h4 className="font-bold text-gray-800">{testimonial.name}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
