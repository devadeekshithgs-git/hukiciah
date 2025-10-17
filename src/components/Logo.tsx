import logo from '@/assets/huki-logo.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Logo = ({ size = 'lg', className = '' }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64'
  };

  return (
    <div className={`flex justify-center ${className}`}>
      <img 
        src={logo} 
        alt="HUKI - Curry in a Hurry" 
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};
