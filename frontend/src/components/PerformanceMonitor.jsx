// src/components/PerformanceMonitor.jsx
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function PerformanceMonitor({ enabled }) {
    const { gl } = useThree();
    
    useEffect(() => {
        if (!enabled) return;
        
        const extension = gl.getContext().getExtension('EXT_disjoint_timer_query_webgl2');
        if (!extension) {
            console.log("⚠️ Performance monitoring not supported");
            return;
        }
        
        console.log("📊 Performance monitoring enabled");
        
        return () => {
            console.log("📊 Performance monitoring disabled");
        };
    }, [enabled, gl]);
    
    return null;
}