import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Grid from '@mui/material/Grid';
import { School, TableChart, Description } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: 'Requirements Management',
    description: 'Upload and manage school requirements for reports. Create and save templates for future use.',
    icon: <School sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />,
    to: '/requirements',
    button: 'Go to Requirements',
  },
  {
    title: 'Smart Table Builder',
    description: 'Create and customize tables for student assessments. Import data and manage metrics efficiently.',
    icon: <TableChart sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />,
    to: '/table',
    button: 'Go to Table Builder',
  },
  {
    title: 'Report Generation',
    description: 'Generate detailed reports automatically. Edit and export in various formats.',
    icon: <Description sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />,
    to: '/reports',
    button: 'Go to Reports',
  },
];

const Home = () => {
  const navigate = useNavigate();
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Teachers Pet
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Your AI-powered assistant for creating detailed school reports
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {features.map((feature) => (
          <Grid key={feature.title} size={{ xs: 12, md: 4 }}>
            <ButtonBase
              onClick={() => navigate(feature.to)}
              sx={{
                width: '100%',
                borderRadius: 2,
                display: 'block',
                textAlign: 'left',
                boxShadow: 2,
                transition: 'box-shadow 0.2s, transform 0.2s',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px) scale(1.03)',
                },
              }}
            >
              <Paper sx={{ p: 3, height: '100%', minHeight: 220, borderRadius: 2, boxShadow: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  {feature.icon}
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {feature.description}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="button" color="primary">
                    {feature.button}
                  </Typography>
                </Box>
              </Paper>
            </ButtonBase>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Home; 