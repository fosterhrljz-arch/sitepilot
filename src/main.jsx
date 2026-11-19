import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return {error};}render(){if(this.state.error)return <div style={{padding:48,fontFamily:'system-ui'}}><h1>SitePilot could not open this view.</h1><p>Your saved projects remain in this browser. Reload the app to retry.</p><button onClick={()=>location.reload()}>Reload SitePilot</button><pre>{this.state.error.message}</pre></div>;return this.props.children;}}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
