declare module 'react-big-calendar/lib/css/react-big-calendar.css';

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}