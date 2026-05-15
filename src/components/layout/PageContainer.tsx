import React from 'react';
import { Box } from '@mui/material';

interface PageContainerProps {
  children: React.ReactNode;
  padding?: boolean;
  scroll?: boolean;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  padding = true,
  scroll = true,
}) => {
  return (
    <Box
      sx={{
        height: '100%',
        overflowY: scroll ? 'auto' : 'hidden',
        overflowX: 'hidden',
        px: padding ? 2 : 0,
        py: padding ? 2 : 0,
        pb: 'calc(var(--tab-bar-height) + var(--safe-bottom) + 8px)',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {children}
    </Box>
  );
};

export default PageContainer;
