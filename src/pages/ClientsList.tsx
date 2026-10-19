import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Search, Mail, Phone, Building, Eye, MapPin } from "lucide-react";
import { toast } from "sonner";
import { ClientDetailsModal, ClientRecord } from "@/components/clients/ClientDetailsModal";

const ClientsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const fetchClients = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (!error && data) {
      setClients(data as ClientRecord[]);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("clients").delete().eq("id", deleteId);
    if (error) {
      if (error.message.includes("projetos vinculados")) {
        toast.error("Não é possível excluir um cliente com projetos vinculados");
      } else {
        toast.error("Erro ao excluir cliente");
      }
    } else {
      toast.success("Cliente excluído");
      fetchClients();
    }
    setDeleteId(null);
  };

  const handleOpenDetails = (client: ClientRecord) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Base de Clientes</h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {clients.length} cadastrado{clients.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie contatos, endereços com ViaCEP e copie dados cadastrais rapidamente
          </p>
        </div>
        <Button asChild className="shadow-subtle">
          <Link to="/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-card border-border/80">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa, e-mail ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card border-border/80">
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b border-border/80">
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Nome</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Telefone</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Empresa / Cidade</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-16">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center">
                          <Search className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Tente buscar por outro termo ou cadastre um novo cliente
                          </p>
                        </div>
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <Link to="/clients/new">
                            <Plus className="h-4 w-4 mr-2" />
                            Cadastrar primeiro cliente
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      onClick={() => handleOpenDetails(c)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-primary transition-colors">{c.name}</span>
                          {c.address && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <MapPin className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>Endereço cadastrado</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {c.email ? (
                          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            {c.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.phone ? (
                          <span className="flex items-center gap-1.5 text-sm font-mono-numbers text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.company ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-foreground">
                              <Building className="h-3 w-3 text-muted-foreground shrink-0" />
                              {c.company}
                            </span>
                          ) : null}
                          {c.city ? (
                            <span className="text-xs text-muted-foreground">
                              {c.city}{c.state ? `/${c.state}` : ""}
                            </span>
                          ) : null}
                          {!c.company && !c.city && (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {/* View Details Action */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => handleOpenDetails(c)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Visualizar & Copiar Dados</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Edit Action */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                                  <Link to={`/clients/${c.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Cliente</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Delete Action */}
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Excluir Cliente</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este cliente? Clientes com projetos vinculados não poderão ser excluídos. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeleteId(c.id);
                                    handleDelete();
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Client Details Modal with Copy */}
      <ClientDetailsModal
        client={selectedClient}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={(id) => navigate(`/clients/${id}/edit`)}
      />
    </div>
  );
};

export default ClientsList;
