#!/bin/bash
# Script de prueba para la función create-user-with-role
# Este script NO se ejecuta automáticamente, es solo para referencia

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Test: create-user-with-role ===${NC}\n"

# Variables de configuración
SUPABASE_URL="https://soxrlxvivuplezssgssq.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/create-user-with-role"

# NOTA: Necesitas obtener un JWT válido de un usuario admin
# Puedes obtenerlo desde el navegador (localStorage o cookies) después de hacer login
echo -e "${YELLOW}IMPORTANTE:${NC} Este script requiere un JWT de admin válido"
echo "Para obtenerlo:"
echo "1. Haz login como admin en la aplicación"
echo "2. Abre DevTools > Console"
echo "3. Ejecuta: localStorage.getItem('sb-<project>-auth-token')"
echo ""

# Placeholder para JWT - reemplazar con JWT real
ADMIN_JWT="YOUR_ADMIN_JWT_HERE"

if [ "$ADMIN_JWT" = "YOUR_ADMIN_JWT_HERE" ]; then
  echo -e "${RED}ERROR: Debes configurar un JWT válido en la variable ADMIN_JWT${NC}"
  exit 1
fi

echo -e "${GREEN}Test 1: Crear usuario secretary${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "secretary1@test.com",
    "password": "password123",
    "role": "secretary"
  }' | jq .

echo -e "\n${GREEN}Test 2: Crear usuario admin${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@test.com",
    "password": "password123",
    "role": "admin"
  }' | jq .

echo -e "\n${GREEN}Test 3: Intentar crear doctor sin doctorId (debe fallar)${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor1@test.com",
    "password": "password123",
    "role": "doctor"
  }' | jq .

echo -e "\n${GREEN}Test 4: Intentar crear usuario sin autenticación (debe fallar)${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "noauth@test.com",
    "password": "password123",
    "role": "secretary"
  }' | jq .

echo -e "\n${GREEN}Test 5: Intentar crear usuario con password corta (debe fallar)${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "short@test.com",
    "password": "123",
    "role": "secretary"
  }' | jq .

echo -e "\n${GREEN}Test 6: Intentar crear usuario con email inválido (debe fallar)${NC}"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123",
    "role": "secretary"
  }' | jq .

echo -e "\n${YELLOW}=== Tests completados ===${NC}"
echo "Revisa los resultados arriba para verificar que todo funciona correctamente"
